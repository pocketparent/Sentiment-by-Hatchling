from flask import Blueprint, request, jsonify
from utils.media import upload_media_to_s3
from utils.openai import generate_tags, transcribe_voice
from models.entry_store import store_entry
from datetime import datetime
import uuid

entry_bp = Blueprint('entry', __name__)

@entry_bp.route('/entry', methods=['POST'])
def create_entry():
    try:
        data = request.get_json()

        # Required fields
        content = data.get('content', '')
        author_id = data.get('author_id')
        source_type = data.get('source_type')
        date_of_memory = data.get('date_of_memory')
        timestamp_created = data.get('timestamp_created') or datetime.utcnow().isoformat()

        if not author_id or not source_type or not date_of_memory:
            return jsonify({"error": "Missing required fields"}), 400

        # Optional fields
        media_url = data.get('media_url')
        transcription = data.get('transcription')
        tags = data.get('tags', [])
        privacy = data.get('privacy', 'private')

        # If transcription not provided but source is voice, attempt transcription
        if not transcription and source_type == "voice" and media_url:
            transcription = transcribe_voice(media_url)

        # Auto-tag if tags not provided
        if not tags and content:
            tags = generate_tags(content)

        entry = {
            "entry_id": f"entry_{uuid.uuid4().hex[:8]}",
            "content": content,
            "media_url": media_url,
            "transcription": transcription,
            "tags": tags,
            "date_of_memory": date_of_memory,
            "timestamp_created": timestamp_created,
            "author_id": author_id,
            "privacy": privacy,
            "source_type": source_type
        }

        # Store the entry in database
        success = store_entry(entry)

        if not success:
            return jsonify({"error": "Entry could not be saved"}), 500

        return jsonify({
            "entry_id": entry["entry_id"],
            "status": "created"
        }), 200

    except Exception as e:
        print(f"Error creating entry: {e}")
        return jsonify({"error": "Internal server error"}), 500
