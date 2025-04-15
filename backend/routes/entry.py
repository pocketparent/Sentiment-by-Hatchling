from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from utils.media import upload_media_to_firebase
from utils.openai_client import transcribe_audio
import openai
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
        manual_tags = request.form.get("tags", "")
        source_type = request.form.get("source_type", "app")

        tag_list = [tag.strip() for tag in manual_tags.split(",") if tag.strip()]

        # Validate required fields
        if not author_id or not date_of_memory:
            return jsonify({"error": "Missing required fields: author_id or date_of_memory"}), 400

        # ✅ AI Tagging
        ai_tags = []
        if content:
            try:
                ai_tags = generate_tags_from_content(content)
            except Exception as e:
                logging.exception("❌ AI tag generation failed")

        combined_tags = list(set(tag_list + ai_tags))

        # ✅ Media Upload
        file = request.files.get("media")
        media_url = None
        transcription = None

        if file:
            try:
                media_url = upload_media_to_firebase(file.stream, file.filename, file.content_type)
                if file.filename.lower().endswith((".m4a", ".mp3", ".ogg")):
                    transcription = transcribe_audio(file.stream)
            except Exception as e:
                logging.exception("❌ Media upload or transcription failed")

        # ✅ Create Firestore Entry
        entry = {
            "content": content,
            "author_id": author_id,
            "date_of_memory": date_of_memory,
            "tags": combined_tags,
            "privacy": privacy,
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
        print("⚡ Connecting to Firestore...")

        entries = []
        docs = db.collection("entries").order_by("date_of_memory", direction=firestore.Query.DESCENDING).stream()

        print("✅ Firestore query executed")
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


# ✅ AI Helper
def generate_tags_from_content(content):
    prompt = f"Generate 3 short, relevant tags (single words or short phrases) for the following memory:\n\n\"{content}\"\n\nTags:"
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=20,
        temperature=0.5
    )
    tags_text = response['choices'][0]['message']['content']
    return [tag.strip("# ").lower() for tag in tags_text.split(",") if tag]
