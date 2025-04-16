from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from utils.media import upload_media_to_firebase
from utils.openai_client import transcribe_audio, get_ai_tags
from utils.auth import authenticate, require_permissions, require_self_or_admin, check_subscription_status
import logging
import traceback
from datetime import datetime
import uuid
from flask import g

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

entry_bp = Blueprint("entry", __name__)
db = firestore.client()

@entry_bp.route("", methods=["POST"])
@entry_bp.route("/", methods=["POST"])
@authenticate
@check_subscription_status
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
            
        # Verify user is creating their own entry or is admin
        if g.user.get('user_id') != author_id and g.user.get('role') != 'admin':
            logger.warning(f"User {g.user.get('user_id')} attempted to create entry for {author_id}")
            return jsonify({"error": "Permission denied: cannot create entries for other users"}), 403

        # Validate privacy setting
        valid_privacy_options = ["private", "shared", "public"]
        if privacy not in valid_privacy_options:
            logger.warning(f"Invalid privacy option: {privacy}")
            privacy = "private"  # Default to private if invalid

        # Initialize entry data
        entry = {
            "content": content,
            "author_id": author_id,
            "date_of_memory": date_of_memory,
            "privacy": privacy,
            "source_type": source_type,
            "timestamp_created": firestore.SERVER_TIMESTAMP,
            "deleted_flag": False
        }

        # Process media file if provided
        file = request.files.get("media")
        if file:
            try:
                # Upload to Firebase Storage
                folder_path = f"users/{author_id}/entries"
                media_url = upload_media_to_firebase(file.stream, file.filename, file.content_type, folder_path)
                entry["media_url"] = media_url
                
                # Transcribe audio if applicable
                if file.content_type.startswith("audio/"):
                    transcription = transcribe_audio(file.stream)
                    if transcription:
                        entry["transcription"] = transcription
            except Exception as e:
                logger.error(f"❌ Media upload failed: {str(e)}")
                # Continue without media rather than failing the request

        # Process tags
        tags = list(manual_tags)  # Start with manual tags
        
        # Generate AI tags if content is provided
        if content and len(content.strip()) > 10:
            try:
                ai_tags = get_ai_tags(content)
                # Merge with manual tags, avoiding duplicates
                for tag in ai_tags:
                    if tag not in tags:
                        tags.append(tag)
            except Exception as e:
                logger.error(f"❌ AI tag generation failed: {str(e)}")
                # Continue without AI tags rather than failing the request
                
        if tags:
            entry["tags"] = tags

        # Save to Firestore
        entry_id = str(uuid.uuid4())
        db.collection("entries").document(entry_id).set(entry)
        
        # Add entry_id to the response
        entry["entry_id"] = entry_id
        
        logger.info(f"✅ Entry created: {entry_id}")
        return jsonify({
            "status": "created",
            "entry": entry
        }), 201
        
    except Exception as e:
        logger.error(f"❌ Error in POST /api/entry: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Entry creation failed", "details": str(e)}), 500

@entry_bp.route("", methods=["GET"])
@entry_bp.route("/", methods=["GET"])
@authenticate
def get_entries():
    """
    Get entries for a user with optional filtering.
    
    Query parameters:
    - user_id: ID of the user to get entries for (required)
    - limit: Maximum number of entries to return (default: 20)
    - start_date: Filter by start date (optional)
    - end_date: Filter by end date (optional)
    - tag: Filter by tag (optional)
    """
    try:
        logger.info("📥 GET /api/entry hit!")
        
        # Get query parameters
        user_id = request.args.get("user_id")
        limit = request.args.get("limit", "20")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        tag = request.args.get("tag")
        
        # Validate required parameters
        if not user_id:
            return jsonify({"error": "Missing required parameter: user_id"}), 400
            
        # Verify user is accessing their own entries or is admin
        if g.user.get('user_id') != user_id and g.user.get('role') != 'admin':
            logger.warning(f"User {g.user.get('user_id')} attempted to access entries for {user_id}")
            return jsonify({"error": "Permission denied: cannot access entries for other users"}), 403
            
        # Convert limit to integer
        try:
            limit = int(limit)
        except ValueError:
            limit = 20
            
        # Build query
        query = db.collection("entries").where("author_id", "==", user_id).where("deleted_flag", "==", False)
        
        # Apply date filters if provided
        if start_date:
            query = query.where("date_of_memory", ">=", start_date)
        if end_date:
            query = query.where("date_of_memory", "<=", end_date)
            
        # Execute query
        entries = []
        for doc in query.stream():
            entry = doc.to_dict()
            entry["entry_id"] = doc.id
            
            # Filter by tag if provided
            if tag and "tags" in entry and tag not in entry["tags"]:
                continue
                
            entries.append(entry)
            
            # Limit results
            if len(entries) >= limit:
                break
                
        logger.info(f"✅ Retrieved {len(entries)} entries for user {user_id}")
        return jsonify({"entries": entries}), 200
        
    except Exception as e:
        logger.error(f"❌ Error in GET /api/entry: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to retrieve entries", "details": str(e)}), 500

@entry_bp.route("/<entry_id>", methods=["GET"])
@authenticate
def get_entry(entry_id):
    """
    Get a specific entry by ID.
    
    Path parameter:
    - entry_id: ID of the entry to retrieve
    """
    try:
        logger.info(f"📥 GET /api/entry/{entry_id} hit!")
        
        # Get entry document
        entry_ref = db.collection("entries").document(entry_id)
        entry_doc = entry_ref.get()
        
        if not entry_doc.exists:
            logger.warning(f"Entry not found: {entry_id}")
            return jsonify({"error": "Entry not found"}), 404
            
        # Get entry data
        entry = entry_doc.to_dict()
        entry["entry_id"] = entry_id
        
        # Check if entry is deleted
        if entry.get("deleted_flag", False):
            logger.warning(f"Attempted to access deleted entry: {entry_id}")
            return jsonify({"error": "Entry not found"}), 404
            
        # Verify user is accessing their own entry or is admin
        if g.user.get('user_id') != entry.get("author_id") and g.user.get('role') != 'admin':
            logger.warning(f"User {g.user.get('user_id')} attempted to access entry {entry_id} owned by {entry.get('author_id')}")
            return jsonify({"error": "Permission denied: cannot access entries for other users"}), 403
            
        logger.info(f"✅ Retrieved entry: {entry_id}")
        return jsonify(entry), 200
        
    except Exception as e:
        logger.error(f"❌ Error in GET /api/entry/{entry_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to retrieve entry", "details": str(e)}), 500

@entry_bp.route("/<entry_id>", methods=["PATCH"])
@authenticate
@check_subscription_status
def update_entry(entry_id):
    """
    Update an existing entry.
    
    Path parameter:
    - entry_id: ID of the entry to update
    
    Request body:
    - content: Updated text content (optional)
    - date_of_memory: Updated date (optional)
    - privacy: Updated privacy setting (optional)
    - tags: Updated tags (optional)
    - media: Updated media file (optional)
    """
    try:
        logger.info(f"📥 PATCH /api/entry/{entry_id} hit!")
        
        # Check if entry exists
        entry_ref = db.collection("entries").document(entry_id)
        entry_doc = entry_ref.get()
        
        if not entry_doc.exists:
            logger.warning(f"Entry not found for update: {entry_id}")
            return jsonify({"error": "Entry not found"}), 404
            
        # Get existing entry data
        existing_entry = entry_doc.to_dict()
        
        # Verify user is updating their own entry or is admin
        if g.user.get('user_id') != existing_entry.get("author_id") and g.user.get('role') != 'admin':
            logger.warning(f"User {g.user.get('user_id')} attempted to update entry {entry_id} owned by {existing_entry.get('author_id')}")
            return jsonify({"error": "Permission denied: cannot update entries for other users"}), 403
            
        # Check if entry is deleted
        if existing_entry.get("deleted_flag", False):
            logger.warning(f"Attempted to update deleted entry: {entry_id}")
            return jsonify({"error": "Entry not found"}), 404
            
        # Get update data from request
        update_data = {}
        
        # Text content
        if "content" in request.form:
            update_data["content"] = request.form.get("content")
            
        # Date of memory
        if "date_of_memory" in request.form:
            update_data["date_of_memory"] = request.form.get("date_of_memory")
            
        # Privacy setting
        if "privacy" in request.form:
            privacy = request.form.get("privacy")
            valid_privacy_options = ["private", "shared", "public"]
            if privacy in valid_privacy_options:
                update_data["privacy"] = privacy
                
        # Tags
        if "tags" in request.form:
            update_data["tags"] = request.form.getlist("tags")
            
        # Add timestamp for update
        update_data["timestamp_updated"] = firestore.SERVER_TIMESTAMP
        
        # Process media file if provided
        file = request.files.get("media")
        if file:
            try:
                # Upload to Firebase Storage
                folder_path = f"users/{existing_entry['author_id']}/entries"
                media_url = upload_media_to_firebase(file.stream, file.filename, file.content_type, folder_path)
                update_data["media_url"] = media_url
                
                # Transcribe audio if applicable
                if file.content_type.startswith("audio/"):
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
@authenticate
@check_subscription_status
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
            
        # Get existing entry data
        existing_entry = entry_doc.to_dict()
        
        # Verify user is deleting their own entry or is admin
        if g.user.get('user_id') != existing_entry.get("author_id") and g.user.get('role') != 'admin':
            logger.warning(f"User {g.user.get('user_id')} attempted to delete entry {entry_id} owned by {existing_entry.get('author_id')}")
            return jsonify({"error": "Permission denied: cannot delete entries for other users"}), 403
            
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
@authenticate
@check_subscription_status
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
@authenticate
@require_permissions('full')
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
@authenticate
@require_permissions('full')
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
