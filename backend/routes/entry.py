from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from utils.media import upload_media_to_firebase
from utils.openai_client import transcribe_audio, get_ai_tags
import logging
import traceback
from datetime import datetime

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
                # Continue without AI tags rather than failing the request
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

        doc_ref = db.collection("entries").add(entry)
        entry_id = doc_ref[1].id
        logger.info(f"✅ Entry created: {entry_id} by {author_id}")
        
        return jsonify({
            "entry_id": entry_id, 
            "status": "created",
            "tags": combined_tags,
            "media_url": media_url
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
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

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
                # Continue without AI tags rather than failing the request

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
        
        return jsonify({
            "status": "updated",
            "entry_id": entry_id,
            "tags": update_data.get("tags", []),
            "media_url": update_data.get("media_url")
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
