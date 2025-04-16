from flask import Blueprint, request, jsonify
import logging
import traceback
from utils.twilio_client import send_ai_response
from utils.openai_client import get_ai_tags, transcribe_audio
from utils.media import download_media_from_url, upload_media_to_firebase
import requests
from firebase_admin import firestore
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sms_bp = Blueprint("sms", __name__)
db = firestore.client()

@sms_bp.route("", methods=["POST"])
@sms_bp.route("/", methods=["POST"])
def handle_sms():
    """
    Handle incoming SMS messages from Twilio and create journal entries.
    
    Request body (from Twilio):
    - From: Phone number of sender
    - Body: Message content
    - MediaUrl0, MediaUrl1, etc.: URLs of media attachments
    - NumMedia: Number of media attachments
    """
    try:
        logger.info("📱 POST /api/sms hit!")
        
        # Get request data
        from_number = request.form.get("From")
        body = request.form.get("Body", "")
        num_media = int(request.form.get("NumMedia", "0"))
        
        logger.info(f"📩 Received SMS from {from_number} with {num_media} media attachments")
        
        if not from_number:
            logger.warning("❌ Missing sender information")
            return create_twiml_response("Sorry, we couldn't process your message. Please try again.")
            
        # Look up user by phone number
        users_ref = db.collection("users").where("phone_number", "==", from_number).limit(1)
        users = list(users_ref.stream())
        
        if not users:
            logger.warning(f"❌ Unknown user with phone number: {from_number}")
            return create_twiml_response("Sorry, this number is not registered with Hatchling. Please register in the app first.")
            
        user = users[0].to_dict()
        user_id = users[0].id
        
        # Process media if any
        media_url = None
        transcription = None
        
        if num_media > 0:
            # Get the first media URL (we'll only use the first one for now)
            twilio_media_url = request.form.get("MediaUrl0")
            
            if twilio_media_url:
                logger.info(f"📷 Processing media from URL: {twilio_media_url}")
                
                try:
                    # Get media content type
                    content_type = request.form.get("MediaContentType0", "")
                    
                    # Download media from Twilio
                    media_data = download_media_from_url(twilio_media_url)
                    
                    if media_data:
                        # Generate a filename
                        file_ext = content_type.split('/')[-1] if '/' in content_type else 'jpg'
                        filename = f"sms_media_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_ext}"
                        
                        # Upload to Firebase Storage
                        folder_path = f"users/{user_id}/entries"
                        media_url = upload_media_to_firebase(media_data, filename, content_type, folder_path)
                        
                        logger.info(f"✅ Media uploaded to Firebase: {media_url}")
                        
                        # Transcribe audio if applicable
                        if content_type.startswith("audio/"):
                            transcription = transcribe_audio(media_data)
                            if transcription:
                                logger.info(f"🎤 Audio transcribed: {transcription[:50]}...")
                                # If no body text was provided, use transcription as the content
                                if not body:
                                    body = transcription
                except Exception as media_error:
                    logger.error(f"❌ Error processing media: {str(media_error)}")
                    logger.error(traceback.format_exc())
        
        # Create entry
        entry = {
            "content": body,
            "author_id": user_id,
            "date_of_memory": datetime.now().strftime("%Y-%m-%d"),
            "privacy": user.get("default_privacy", "private"),
            "source_type": "sms",
            "timestamp_created": firestore.SERVER_TIMESTAMP,
            "deleted_flag": False
        }
        
        # Add media URL if processed successfully
        if media_url:
            entry["media_url"] = media_url
            
        # Add transcription if available
        if transcription:
            entry["transcription"] = transcription
            
        # Generate tags
        if body:
            try:
                tags = get_ai_tags(body)
                entry["tags"] = tags
                logger.info(f"🏷️ Generated tags: {tags}")
            except Exception as tag_error:
                logger.error(f"❌ Error generating tags: {str(tag_error)}")
                # Continue without tags rather than failing
        
        # Save entry to Firestore
        entry_id = str(uuid.uuid4())
        db.collection("entries").document(entry_id).set(entry)
        
        logger.info(f"✅ SMS entry created: {entry_id} from {from_number}")
        
        # Send AI response
        try:
            send_ai_response(from_number, body)
        except Exception as response_error:
            logger.error(f"❌ Error sending AI response: {str(response_error)}")
            # Continue even if response fails
        
        # Return success response for Twilio
        return create_twiml_response("Got it! Your memory has been saved to your Hatchling journal.")
        
    except Exception as e:
        logger.error(f"❌ Error in POST /api/sms: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return error response for Twilio
        return create_twiml_response("Sorry, we couldn't save your memory. Please try again later.")

def create_twiml_response(message):
    """Create a TwiML response with the given message."""
    response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{message}</Message>
</Response>"""
    return response, 200, {"Content-Type": "text/xml"}
