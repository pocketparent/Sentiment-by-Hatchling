from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from utils.media import upload_media_to_firebase
from utils.openai_client import transcribe_audio, get_ai_tags
import logging
import traceback
from datetime import datetime
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

entry_bp = Blueprint("entry", __name__)
db = firestore.client()

@entry_bp.route("", methods=["POST"])
@entry_bp.route("/", methods=["POST"])
def create_entry():
    """
    Create a new memory entry with text, media, tags, and metadata.
    
    Required fields:
    - author_id: User ID of the author
    - date_of_memory: Date the memory occurred
    
    Optional fields:
    - content: Text content of the memory
    - privacy: 'private', 'shared', or 'public' (default: 'private')
    - tags: List of manual tags
    - media: File upload (photo, video, audio)
    - source_type: 'app', 'sms', or 'voice' (default: 'app')
    """
    try:
        logger.info("📥 POST /api/entry hit!")
        content = request.form.get("content", "")
        author_id = request.form.get("author_id")
        date_of_memory = request.form.get("date_of_memory")
        privacy = request.form.get("privacy", "private")
        manual_tags = request.form.getlist("tags")
        source_type = request.form.get("source_type", "app")

        # Validate required fields
        if not author_id or not date_of_memory:
            logger.warning("Missing required fields in entry creation")
            return jsonify({"error": "Missing required fields: author_id or date_of_memory"}), 400

        # Validate privacy setting
        valid_privacy_options = ["private", "shared", "public"]
        if privacy not in valid_privacy_options:
            logger.warning(f"Invalid privacy option: {privacy}")
            privacy = "private"  # Default to private if invalid

        # Validate date is not in the future
        try:
            memory_date = datetime.strptime(date_of_memory, "%Y-%m-%d")
            today = datetime.now()
            if memory_date > today:
                logger.warning(f"Future date provided: {date_of_memory}")
                return jsonify({"error": "The memory date cannot be in the future."}), 400
        except ValueError:
            logger.warning(f"Invalid date format: {date_of_memory}")
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

        # Handle tags
        tag_list = [tag.strip() for tag in manual_tags if tag.strip()]
        ai_tags = []
        if content and not tag_list:  # Only generate AI tags if no manual tags provided
            try:
                ai_tags = get_ai_tags(content)
                logger.info(f"🧠 AI tags generated: {ai_tags}")
            except Exception as e:
                logger.error(f"❌ AI tag generation failed: {str(e)}")
                # Generate fallback tags based on content
                ai_tags = generate_fallback_tags(content)
                logger.info(f"🔄 Fallback tags generated: {ai_tags}")
        combined_tags = list(set(tag_list + ai_tags))

        # Handle media
        file = request.files.get("media")
        media_url = None
        transcription = None
        if file:
            try:
                logger.info(f"📂 Media file received: {file.filename}")
                file.stream.seek(0)
                
                # Create folder structure by user_id
                folder_path = f"users/{author_id}/entries"
                media_url = upload_media_to_firebase(file.stream, file.filename, file.content_type, folder_path)
                logger.info(f"✅ Media uploaded to: {media_url}")

                # Transcribe audio files
                file.stream.seek(0)
                if file.filename.lower().endswith((".m4a", ".mp3", ".ogg", ".wav")):
                    transcription = transcribe_audio(file.stream)
                    logger.info(f"📝 Transcription: {transcription}")
            except Exception as e:
                logger.error(f"❌ Media upload or transcription failed: {str(e)}")
                # Continue without media rather than failing the request

        # Compose and save entry
        entry = {
            "content": content,
            "author_id": author_id,
            "date_of_memory": date_of_memory,
            "privacy": privacy,
            "tags": combined_tags,
            "media_url": media_url,
            "transcription": transcription,
            "source_type": source_type,
            "timestamp_created": firestore.SERVER_TIMESTAMP,
            "deleted_flag": False
        }

        # Add journal_id for future multi-child support
        journal_id = request.form.get("journal_id")
        if journal_id:
            entry["journal_id"] = journal_id

        # Generate a unique ID for the entry
        entry_id = str(uuid.uuid4())
        
        # Add to Firestore with the generated ID
        db.collection("entries").document(entry_id).set(entry)
        
        logger.info(f"✅ Entry created: {entry_id} by {author_id}")
        
        # Return the complete entry for immediate display
        entry["entry_id"] = entry_id
        
        return jsonify({
            "entry": entry,
            "status": "created"
        }), 200

    except Exception as e:
        logger.error(f"❌ Error in POST /api/entry: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@entry_bp.route("", methods=["GET"])
@entry_bp.route("/", methods=["GET"])
def get_entries():
    """
    Fetch all entries for a journal with optional filters.
    
    Query parameters:
    - author_id: Filter by author
    - tag: Filter by tag
    - privacy: Filter by privacy level
    - sort_order: 'asc' or 'desc' (default: 'desc')
    """
    try:
        logger.info("📥 GET /api/entry hit!")
        
        # Get query parameters
        author_id = request.args.get("author_id")
        tag_filter = request.args.get("tag")
        privacy_filter = request.args.get("privacy")
        sort_order = request.args.get("sort_order", "desc").lower()
        
        # Validate sort order
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
            
        # Convert to Firestore direction
        direction = firestore.Query.DESCENDING if sort_order == "desc" else firestore.Query.ASCENDING
        
        # Start with base query
        query = db.collection("entries").where("deleted_flag", "==", False)
        
        # Apply filters if provided
        if author_id:
            query = query.where("author_id", "==", author_id)
            
        if privacy_filter:
            query = query.where("privacy", "==", privacy_filter)
            
        # Apply sorting
        query = query.order_by("date_of_memory", direction=direction)
        
        # Execute query
        docs = query.stream()
        
        # Process results
        entries = []
        for doc in docs:
            entry = doc.to_dict()
            entry["entry_id"] = doc.id
            
            # Apply tag filter after fetching (Firestore doesn't support array contains in compound queries)
            if tag_filter and tag_filter not in entry.get("tags", []):
                continue
                
            entries.append(entry)

        logger.info(f"📦 Returning {len(entries)} entries")
        return jsonify({"entries": entries}), 200
        
    except Exception as e:
        logger.error(f"❌ Error in GET /api/entry: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return empty entries array instead of error to prevent UI breakage
        return jsonify({"entries": [], "error": str(e)}), 200

@entry_bp.route("/<entry_id>", methods=["PATCH"])
def update_entry(entry_id):
    """
    Update an existing entry.
    
    Path parameter:
    - entry_id: ID of the entry to update
    
    Form data:
    - Same fields as create_entry
    """
    try:
        logger.info(f"🛠 PATCH /api/entry/{entry_id} hit")
        
        # Check if entry exists
        entry_ref = db.collection("entries").document(entry_id)
        entry_doc = entry_ref.get()
        
        if not entry_doc.exists:
            logger.warning(f"Entry not found: {entry_id}")
            return jsonify({"error": "Entry not found"}), 404
            
        # Get existing entry data
        existing_entry = entry_doc.to_dict()
        
        # Get form data
        data = request.form
        content = data.get("content", existing_entry.get("content", ""))
        author_id = data.get("author_id", existing_entry.get("author_id"))
        date_of_memory = data.get("date_of_memory", existing_entry.get("date_of_memory"))
        privacy = data.get("privacy", existing_entry.get("privacy", "private"))
        manual_tags = request.form.getlist("tags")
        
        # Validate required fields
        if not author_id or not date_of_memory:
            logger.warning("Missing required fields in entry update")
            return jsonify({"error": "Missing required fields: author_id or date_of_memory"}), 400
            
        # Validate privacy setting
        valid_privacy_options = ["private", "shared", "public"]
        if privacy not in valid_privacy_options:
            logger.warning(f"Invalid privacy option: {privacy}")
            privacy = existing_entry.get("privacy", "private")
            
        # Validate date is not in the future
        try:
            memory_date = datetime.strptime(date_of_memory, "%Y-%m-%d")
            today = datetime.now()
            if memory_date > today:
                logger.warning(f"Future date provided: {date_of_memory}")
                return jsonify({"error": "The memory date cannot be in the future."}), 400
        except ValueError:
            logger.warning(f"Invalid date format: {date_of_memory}")
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

        # Handle tags
        tag_list = [tag.strip() for tag in manual_tags if tag.strip()]
        ai_tags = []
        if not tag_list and content:
            try:
                ai_tags = get_ai_tags(content)
                logger.info(f"🧠 AI tags (update): {ai_tags}")
            except Exception as e:
                logger.error(f"❌ AI tag generation failed in PATCH: {str(e)}")
                # Generate fallback tags based on content
                ai_tags = generate_fallback_tags(content)
                logger.info(f"🔄 Fallback tags generated: {ai_tags}")

        combined_tags = list(set(tag_list + ai_tags))

        # Prepare update data
        update_data = {
            "content": content,
            "author_id": author_id,
            "date_of_memory": date_of_memory,
            "privacy": privacy,
            "tags": combined_tags if combined_tags else existing_entry.get("tags", [])
        }

        # Handle media
        file = request.files.get("media")
        if file:
            try:
                logger.info(f"📂 Updating with media file: {file.filename}")
                file.stream.seek(0)
                
                # Create folder structure by user_id
                folder_path = f"users/{author_id}/entries"
                update_data["media_url"] = upload_media_to_firebase(file.stream, file.filename, file.content_type, folder_path)

                # Transcribe audio files
                file.stream.seek(0)
                if file.filename.lower().endswith((".m4a", ".mp3", ".ogg", ".wav")):
                    update_data["transcription"] = transcribe_audio(file.stream)
            except Exception as e:
                logger.error(f"❌ Media upload or transcription failed in PATCH: {str(e)}")
                # Continue without media rather than failing the request

        # Update the entry
        entry_ref.update(update_data)
        logger.info(f"✅ Entry {entry_id} updated successfully")
        
        # Get the updated entry to return
        updated_entry = entry_ref.get().to_dict()
        updated_entry["entry_id"] = entry_id
        
        return jsonify({
            "status": "updated",
            "entry": updated_entry
        }), 200

    except Exception as e:
        logger.error(f"❌ Error in PATCH /api/entry/{entry_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Update failed", "details": str(e)}), 500

@entry_bp.route("/<entry_id>", methods=["DELETE"])
def delete_entry(entry_id):
    """
    Soft delete an entry (sets deleted_flag to true).
    
    Path parameter:
    - entry_id: ID of the entry to delete
    """
    try:
        logger.info(f"🗑️ DELETE /api/entry/{entry_id} hit")
        
        # Check if entry exists
        entry_ref = db.collection("entries").document(entry_id)
        entry_doc = entry_ref.get()
        
        if not entry_doc.exists:
            logger.warning(f"Entry not found for deletion: {entry_id}")
            return jsonify({"error": "Entry not found"}), 404
            
        # Soft delete by setting deleted_flag to true
        entry_ref.update({"deleted_flag": True})
        logger.info(f"✅ Entry {entry_id} soft deleted")
        
        return jsonify({"status": "deleted", "entry_id": entry_id}), 200
        
    except Exception as e:
        logger.error(f"❌ Error in DELETE /api/entry/{entry_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Delete failed", "details": str(e)}), 500

# Add dedicated endpoint for AI tag generation
@entry_bp.route("/generate-tags", methods=["POST"])
def generate_tags():
    """
    Generate AI tags for content.
    
    Request body:
    - content: Text content to generate tags for
    """
    try:
        logger.info("📥 POST /api/entry/generate-tags hit!")
        
        # Get request data
        data = request.json
        if not data or "content" not in data:
            return jsonify({"error": "Missing content in request"}), 400
            
        content = data["content"]
        if not content or len(content.strip()) < 10:
            return jsonify({"error": "Content too short for tag generation"}), 400
            
        # Generate tags
        try:
            tags = get_ai_tags(content)
            logger.info(f"🧠 AI tags generated: {tags}")
        except Exception as e:
            logger.error(f"❌ AI tag generation failed: {str(e)}")
            # Generate fallback tags based on content
            tags = generate_fallback_tags(content)
            logger.info(f"🔄 Fallback tags generated: {tags}")
            
        return jsonify({"tags": tags}), 200
        
    except Exception as e:
        logger.error(f"❌ Error in POST /api/entry/generate-tags: {str(e)}")
        logger.error(traceback.format_exc())
        # Generate fallback tags even on general errors
        try:
            content = request.json.get("content", "")
            tags = generate_fallback_tags(content)
            return jsonify({"tags": tags, "fallback": True}), 200
        except:
            return jsonify({"tags": ["memory"], "fallback": True}), 200

# SMS entry endpoint
@entry_bp.route("/sms", methods=["POST"])
def sms_entry():
    """
    Handle incoming SMS messages and create entries.
    
    Request body (from Twilio):
    - From: Phone number of sender
    - Body: Message content
    - MediaUrl0, MediaUrl1, etc.: URLs of media attachments
    """
    try:
        logger.info("📥 POST /api/entry/sms hit!")
        
        # Get request data
        from_number = request.form.get("From")
        body = request.form.get("Body", "")
        
        if not from_number:
            return jsonify({"error": "Missing sender information"}), 400
            
        # Look up user by phone number
        users_ref = db.collection("users").where("phone_number", "==", from_number).limit(1)
        users = list(users_ref.stream())
        
        if not users:
            logger.warning(f"Unknown user with phone number: {from_number}")
            # Return a friendly message for unauthorized numbers
            response = f"<?xml version='1.0' encoding='UTF-8'?><Response><Message>Sorry, this number is not registered with Hatchling. Please register in the app first.</Message></Response>"
            return response, 200, {"Content-Type": "text/xml"}
            
        user = users[0].to_dict()
        user_id = users[0].id
        
        # Process media if any
        media_urls = []
        for i in range(10):  # Twilio can send up to 10 media attachments
            media_url = request.form.get(f"MediaUrl{i}")
            if media_url:
                media_urls.append(media_url)
                
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
        
        # Add media URLs if any
        if media_urls:
            entry["media_url"] = media_urls[0]  # Store first media URL
            
        # Generate tags
        if body:
            try:
                tags = get_ai_tags(body)
            except Exception as e:
                logger.error(f"❌ AI tag generation failed for SMS: {str(e)}")
                tags = generate_fallback_tags(body)
                
            entry["tags"] = tags
            
        # Save entry
        entry_id = str(uuid.uuid4())
        db.collection("entries").document(entry_id).set(entry)
        
        logger.info(f"✅ SMS entry created: {entry_id} from {from_number}")
        
        # Return success response for Twilio
        response = f"<?xml version='1.0' encoding='UTF-8'?><Response><Message>Got it! Your memory has been saved.</Message></Response>"
        return response, 200, {"Content-Type": "text/xml"}
        
    except Exception as e:
        logger.error(f"❌ Error in POST /api/entry/sms: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return error response for Twilio
        response = f"<?xml version='1.0' encoding='UTF-8'?><Response><Message>Sorry, we couldn't save your memory. Please try again later.</Message></Response>"
        return response, 200, {"Content-Type": "text/xml"}

# Test routes for development
@entry_bp.route("/test-openai", methods=["GET"])
def test_openai():
    """Test route for OpenAI integration."""
    try:
        prompt = "Say hello from Hatchling"
        tags = get_ai_tags(prompt)
        return jsonify({"response": f"AI responded with: {tags}"})
    except Exception as e:
        logger.error(f"❌ OpenAI test failed: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "OpenAI test failed", "details": str(e)}), 500

@entry_bp.route("/test-upload", methods=["POST"])
def test_upload():
    """Test route for media upload functionality."""
    try:
        file = request.files.get("media")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400
            
        folder_path = "test-uploads"
        url = upload_media_to_firebase(file.stream, file.filename, file.content_type, folder_path)
        return jsonify({"media_url": url}), 200
    except Exception as e:
        logger.error(f"❌ Upload test failed: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# Helper function for generating fallback tags when OpenAI is unavailable
def generate_fallback_tags(content):
    """Generate basic tags based on content keywords."""
    content = content.lower()
    tags = []
    
    # Check for common keywords
    if any(word in content for word in ["baby", "infant", "newborn"]):
        tags.append("baby")
    if any(word in content for word in ["sleep", "nap", "bedtime"]):
        tags.append("sleep")
    if any(word in content for word in ["food", "eat", "feeding", "meal"]):
        tags.append("food")
    if any(word in content for word in ["smile", "laugh", "happy", "joy"]):
        tags.append("happy")
    if any(word in content for word in ["cry", "sad", "upset", "tears"]):
        tags.append("emotional")
    if any(word in content for word in ["walk", "crawl", "stand", "step"]):
        tags.append("milestone")
    if any(word in content for word in ["doctor", "sick", "health", "medicine"]):
        tags.append("health")
    if any(word in content for word in ["play", "toy", "game", "fun"]):
        tags.append("play")
    if any(word in content for word in ["family", "mom", "dad", "parent"]):
        tags.append("family")
    
    # Add a default tag if none were found
    if not tags:
        tags.append("memory")
        
    return tags
