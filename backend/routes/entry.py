from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from utils.media import upload_media_to_firebase

entry_bp = Blueprint("entry", __name__)
db = firestore.client()

@entry_bp.route("/entry", methods=["POST"])
def create_entry():
    content = request.form.get("content")
    author_id = request.form.get("author_id")
    date_of_memory = request.form.get("date_of_memory")
    tags = request.form.getlist("tags")
    privacy = request.form.get("privacy", "private")

    file = request.files.get("media")
    media_url = None
    if file:
        media_url = upload_media_to_firebase(file.stream, file.filename, file.content_type)

    entry = {
        "content": content,
        "author_id": author_id,
        "date_of_memory": date_of_memory,
        "tags": tags,
        "privacy": privacy,
        "media_url": media_url
    }
    doc_ref = db.collection("entries").add(entry)
    return jsonify({"entry_id": doc_ref[1].id, "status": "created"}), 200
