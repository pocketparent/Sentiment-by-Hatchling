from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from utils.openai_client import get_ai_tags
import logging
import traceback
from datetime import datetime
import re
import random
import string

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sms_bp = Blueprint("sms", __name__)
db = firestore.client()

# Store verification codes in memory (in production, use a more persistent solution)
verification_codes = {}

@sms_bp.route("/webhook", methods=["POST"])
def sms_webhook():
    """
    Webhook endpoint for receiving SMS messages from a provider (e.g., Twilio).
    
    Expected POST parameters:
    - From: Phone number of the sender
    - Body: Text content of the SMS
    - MessageSid: Unique identifier for the message (provider-specific)
    
    Additional parameters may be present depending on the SMS provider.
    """
    try:
        logger.info("📱 SMS webhook hit!")
        
        # Extract SMS data from request
        phone_number = request.form.get("From")
        message_body = request.form.get("Body")
        message_id = request.form.get("MessageSid")
        
        # Validate required fields
        if not phone_number or not message_body:
            logger.warning("Missing required SMS fields")
            return jsonify({"error": "Missing required fields: From or Body"}), 400
        
        # Log the incoming message
        logger.info(f"📩 SMS received from {phone_number}: {message_body[:50]}...")
        
        # Look up user by phone number
        user_query = db.collection("users").where("phone_number", "==", phone_number).limit(1).stream()
        user_docs = list(user_query)
        
        if not user_docs:
            logger.warning(f"No user found with phone number: {phone_number}")
            # Store the message anyway for future processing
            db.collection("unprocessed_sms").add({
                "phone_number": phone_number,
                "message": message_body,
                "message_id": message_id,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "processed": False
            })
            return jsonify({"status": "unprocessed", "reason": "user_not_found"}), 200
        
        user_doc = user_docs[0]
        user_id = user_doc.id
        user_data = user_doc.to_dict()
        
        # Check if user has an active subscription
        if not user_data.get("subscription_active", False):
            logger.warning(f"User {user_id} does not have an active subscription")
            return jsonify({"status": "rejected", "reason": "no_active_subscription"}), 200
        
        # Process the message to extract date and content
        date_of_memory, content = extract_date_and_content(message_body)
        
        # Generate AI tags if content is substantial
        tags = []
        if len(content) >= 10:
            try:
                tags = get_ai_tags(content)
                logger.info(f"🧠 AI tags generated for SMS: {tags}")
            except Exception as e:
                logger.error(f"❌ AI tag generation failed for SMS: {str(e)}")
                # Continue without tags rather than failing
        
        # Create journal entry
        entry = {
            "content": content,
            "author_id": user_id,
            "date_of_memory": date_of_memory,
            "privacy": "private",  # Default to private for SMS entries
            "tags": tags,
            "source_type": "sms",
            "timestamp_created": firestore.SERVER_TIMESTAMP,
            "deleted_flag": False,
            "sms_metadata": {
                "phone_number": phone_number,
                "message_id": message_id,
                "raw_message": message_body
            }
        }
        
        # Save to Firestore
        doc_ref = db.collection("entries").add(entry)
        entry_id = doc_ref[1].id
        logger.info(f"✅ SMS entry created: {entry_id} for user {user_id}")
        
        # Record SMS processing success
        db.collection("processed_sms").add({
            "phone_number": phone_number,
            "message_id": message_id,
            "entry_id": entry_id,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "success": True
        })
        
        return jsonify({
            "status": "success",
            "entry_id": entry_id,
            "tags": tags
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in SMS webhook: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

def extract_date_and_content(message_body):
    """
    Extract date and content from SMS message.
    
    Attempts to find a date in the message in various formats.
    If no date is found, uses today's date.
    
    Returns:
        tuple: (date_string, content)
    """
    # Common date patterns in SMS messages
    date_patterns = [
        # YYYY-MM-DD
        r'(\d{4}-\d{1,2}-\d{1,2})',
        # MM/DD/YYYY
        r'(\d{1,2}/\d{1,2}/\d{4})',
        # DD/MM/YYYY
        r'(\d{1,2}/\d{1,2}/\d{4})',
        # Month DD, YYYY
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
        # DD Month YYYY
        r'(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})'
    ]
    
    # Try to find a date in the message
    date_match = None
    for pattern in date_patterns:
        match = re.search(pattern, message_body, re.IGNORECASE)
        if match:
            date_match = match
            break
    
    if date_match:
        # Extract the date and remove it from the content
        date_str = date_match.group(0)
        content = message_body.replace(date_str, '').strip()
        
        # Try to convert to YYYY-MM-DD format
        try:
            # This is a simplified approach - in production, you'd want more robust date parsing
            # For now, just use the matched date string if it's in YYYY-MM-DD format
            if re.match(r'\d{4}-\d{1,2}-\d{1,2}', date_str):
                date_of_memory = date_str
            else:
                # Default to today's date if conversion fails
                date_of_memory = datetime.now().strftime('%Y-%m-%d')
        except:
            date_of_memory = datetime.now().strftime('%Y-%m-%d')
    else:
        # No date found, use today's date
        date_of_memory = datetime.now().strftime('%Y-%m-%d')
        content = message_body.strip()
    
    return date_of_memory, content

@sms_bp.route("/status", methods=["GET"])
def sms_status():
    """
    Check the status of the SMS integration.
    """
    return jsonify({
        "status": "active",
        "message": "SMS integration is active and ready to receive messages"
    }), 200

@sms_bp.route("/verify", methods=["POST"])
def verify_phone():
    """
    Send a verification code to a phone number.
    
    POST parameters:
    - phone_number: Phone number to verify
    - user_id: User ID to associate with the phone number
    """
    try:
        data = request.json
        phone_number = data.get("phone_number")
        user_id = data.get("user_id")
        
        if not phone_number or not user_id:
            return jsonify({"success": False, "message": "Missing required fields: phone_number or user_id"}), 400
        
        # Generate a 6-digit verification code
        verification_code = ''.join(random.choices(string.digits, k=6))
        
        # Store the verification code (in production, use a more secure method with expiration)
        verification_codes[phone_number] = {
            "code": verification_code,
            "user_id": user_id,
            "created_at": datetime.now()
        }
        
        # In a real implementation, you would send an SMS here using a service like Twilio
        # For this demo, we'll just log it and pretend it was sent
        logger.info(f"📤 Verification code for {phone_number}: {verification_code}")
        
        # For testing purposes, store the code in Firestore so we can see it
        db.collection("verification_codes").add({
            "phone_number": phone_number,
            "code": verification_code,
            "user_id": user_id,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "used": False
        })
        
        return jsonify({
            "success": True,
            "message": f"Verification code sent to {phone_number}"
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error sending verification code: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "message": f"Failed to send verification code: {str(e)}"}), 500

@sms_bp.route("/confirm", methods=["POST"])
def confirm_verification():
    """
    Confirm a verification code.
    
    POST parameters:
    - phone_number: Phone number being verified
    - code: Verification code to confirm
    - user_id: User ID to associate with the phone number
    """
    try:
        data = request.json
        phone_number = data.get("phone_number")
        code = data.get("code")
        user_id = data.get("user_id")
        
        if not phone_number or not code or not user_id:
            return jsonify({"success": False, "message": "Missing required fields"}), 400
        
        # Check if the verification code is valid
        stored_data = verification_codes.get(phone_number)
        
        # For testing purposes, also check Firestore
        if not stored_data:
            # Try to find the code in Firestore
            code_query = db.collection("verification_codes")\
                .where("phone_number", "==", phone_number)\
                .where("code", "==", code)\
                .where("used", "==", False)\
                .limit(1).stream()
            
            code_docs = list(code_query)
            if code_docs:
                code_doc = code_docs[0]
                code_data = code_doc.to_dict()
                stored_data = {
                    "code": code_data.get("code"),
                    "user_id": code_data.get("user_id"),
                    "created_at": datetime.now()  # Approximate
                }
                
                # Mark the code as used
                db.collection("verification_codes").document(code_doc.id).update({
                    "used": True,
                    "verified_at": firestore.SERVER_TIMESTAMP
                })
        
        if not stored_data:
            return jsonify({"success": False, "message": "Invalid verification code"}), 400
        
        if stored_data.get("code") != code:
            return jsonify({"success": False, "message": "Invalid verification code"}), 400
        
        if stored_data.get("user_id") != user_id:
            return jsonify({"success": False, "message": "User ID mismatch"}), 400
        
        # Check if the code is expired (30 minutes)
        created_at = stored_data.get("created_at")
        if (datetime.now() - created_at).total_seconds() > 1800:
            return jsonify({"success": False, "message": "Verification code expired"}), 400
        
        # Update the user's phone number in Firestore
        db.collection("users").document(user_id).update({
            "phone_number": phone_number,
            "phone_verified": True,
            "phone_verified_at": firestore.SERVER_TIMESTAMP
        })
        
        # Remove the verification code
        if phone_number in verification_codes:
            del verification_codes[phone_number]
        
        return jsonify({
            "success": True,
            "message": "Phone number verified successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error confirming verification code: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "message": f"Failed to confirm verification code: {str(e)}"}), 500

@sms_bp.route("/test", methods=["POST"])
def test_sms():
    """
    Test endpoint for simulating an SMS message.
    
    POST parameters:
    - phone_number: Phone number to simulate as sender
    - message: Text content of the SMS
    """
    try:
        data = request.json
        phone_number = data.get("phone_number")
        message = data.get("message")
        
        if not phone_number or not message:
            return jsonify({"error": "Missing required fields: phone_number or message"}), 400
        
        # Create a mock request form
        mock_form = {
            "From": phone_number,
            "Body": message,
            "MessageSid": f"TEST_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        }
        
        # Replace the actual request form with our mock
        original_form = request.form
        request.form = mock_form
        
        # Process the mock SMS
        result = sms_webhook()
        
        # Restore the original request form
        request.form = original_form
        
        return jsonify({
            "status": "test_complete",
            "result": result.get_json()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in SMS test: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Test failed", "details": str(e)}), 500
