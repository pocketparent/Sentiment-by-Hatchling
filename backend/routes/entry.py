from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from utils.media import upload_media_to_firebase
from utils.openai_client import transcribe_audio, get_ai_tags
import logging
import traceback

entry_bp = Blueprint("entry", __name__)
db = firestore.client()

@entry_bp.route("", methods=["POST"])
@entry_bp.route("/", methods=["POST"])
def create_entry():
    try:
        print("📥 POST /api/entry hit!")
        content = request.form.get("content", "")
        author_id = request.form.get("author_id")
        date_of_memory = request.form.get("date_of_memory")
        privacy = request.form.get("privacy", "private")
        manual_tags = request.form.getlist("tags")
        source_type = request.form.get("source_type", "app")

        if not author_id or not date_of_memory:
            return jsonify({"error": "Missing required fields: author_id or date_of_memory"}), 400

        # Handle tags
        tag_list = [tag.strip() for tag in manual_tags if tag.strip()]
        ai_tags = []
        if content:
            try:
                ai_tags = get_ai_tags(content)
                print("🧠 AI tags generated:", ai_tags)
            except Exception:
                logging.exception("❌ AI tag generation failed")
        combined_tags = list(set(tag_list + ai_tags))

        # Handle media
        file = request.files.get("media")
        media_url = None
        transcription = None
        if file:
            try:
                print(f"📂 Media file received: {file.filename}")
                file.stream.seek(0)
                media_url = upload_media_to_firebase(file.stream, file.filename, file.content_type)
                print(f"✅ Media uploaded to: {media_url}")

                file.stream.seek(0)
                if file.filename.lower().endswith((".m4a", ".mp3", ".ogg")):
                    transcription = transcribe_audio(file.stream)
                    print(f"📝 Transcription: {transcription}")
            except Exception:
                logging.exception("❌ Media upload or transcription failed")

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
            "created_at": firestore.SERVER_TIMESTAMP
        }

        doc_ref = db.collection("entries").add(entry)
        logging.info(f"✅ Entry created: {doc_ref[1].id} by {author_id}")
        return jsonify({"entry_id": doc_ref[1].id, "status": "created"}), 200

    except Exception as e:
        print("❌ Error in POST /api/entry:")
        print(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@entry_bp.route("", methods=["GET"])
@entry_bp.route("/", methods=["GET"])
def get_entries():
    try:
        print("📥 GET /api/entry hit!")
        entries = []
        docs = db.collection("entries").order_by("date_of_memory", direction=firestore.Query.DESCENDING).stream()

        for doc in docs:
            entry = doc.to_dict()
            entry["entry_id"] = doc.id
            entries.append(entry)

        print(f"📦 Returning {len(entries)} entries")
        return jsonify({"entries": entries}), 200
    except Exception as e:
        print("❌ Error in GET /api/entry:")
        print(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@entry_bp.route("/<entry_id>", methods=["PATCH"])
def update_entry(entry_id):
    try:
        print(f"🛠 PATCH /api/entry/{entry_id} hit")
        data = request.form
        content = data.get("content", "")
        author_id = data.get("author_id")
        date_of_memory = data.get("date_of_memory")
        privacy = data.get("privacy", "private")
        manual_tags = request.form.getlist("tags")

        tag_list = [tag.strip() for tag in manual_tags if tag.strip()]
        ai_tags = []
        if not tag_list and content:
            try:
                ai_tags = get_ai_tags(content)
                print("🧠 AI tags (update):", ai_tags)
            except Exception:
                logging.exception("❌ AI tag generation failed in PATCH")

        combined_tags = list(set(tag_list + ai_tags))

        update_data = {
            "content": content,
            "author_id": author_id,
            "date_of_memory": date_of_memory,
            "privacy": privacy,
            "tags": combined_tags
        }

        file = request.files.get("media")
        if file:
            try:
                print(f"📂 Updating with media file: {file.filename}")
                file.stream.seek(0)
                update_data["media_url"] = upload_media_to_firebase(file.stream, file.filename, file.content_type)

                file.stream.seek(0)
                if file.filename.lower().endswith((".m4a", ".mp3", ".ogg")):
                    update_data["transcription"] = transcribe_audio(file.stream)
            except Exception:
                logging.exception("❌ Media upload or transcription failed in PATCH")

        db.collection("entries").document(entry_id).update(update_data)
        print(f"✅ Entry {entry_id} updated successfully")
        return jsonify({"status": "updated"}), 200

    except Exception as e:
        print("❌ Error in PATCH /api/entry/<id>:")
        print(traceback.format_exc())
        return jsonify({"error": "Update failed", "details": str(e)}), 500

@entry_bp.route("/test-openai", methods=["GET"])
def test_openai():
    try:
        prompt = "Say hello from Hatchling"
        tags = get_ai_tags(prompt)
        return jsonify({"response": f"AI responded with: {tags}"})
    except Exception as e:
        print("❌ OpenAI test failed:")
        print(traceback.format_exc())
        return jsonify({"error": "OpenAI test failed", "details": str(e)}), 500

@entry_bp.route("/test-upload", methods=["POST"])
def test_upload():
    try:
        file = request.files.get("media")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400
        url = upload_media_to_firebase(file.stream, file.filename, file.content_type)
        return jsonify({"media_url": url}), 200
    except Exception as e:
        print("❌ Upload test failed:")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
