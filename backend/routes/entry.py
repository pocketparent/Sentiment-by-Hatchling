from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from utils.media import upload_media_to_firebase
import openai
import os
import logging

entry_bp = Blueprint("entry", __name__)
db = firestore.client()

@entry_bp.route("/entry", methods=["POST"])
def create_entry():
    content = request.form.get("content")
    author_id = request.form.get("author_id")
    date_of_memory = request.form.get("date_of_memory")
    privacy = request.form.get("privacy", "private")
    manual_tags = request.form.get("tags", "")
    tag_list = [tag.strip() for tag in manual_tags.split(",") if tag.strip()]

    # AI Tagging
    ai_tags = []
    if content:
        try:
            ai_tags = generate_tags_from_content(content)
        except Exception as e:
            logging.exception("AI tag generation failed")

    # Merge tags
    combined_tags = list(set(tag_list + ai_tags))

    # Media upload
    file = request.files.get("media")
    media_url = None
    if file:
        media_url = upload_media_to_firebase(file.stream, file.filename, file.content_type)

    # Entry object
    entry = {
        "content": content,
        "author_id": author_id,
        "date_of_memory": date_of_memory,
        "tags": combined_tags,
        "privacy": privacy,
        "media_url": media_url,
        "source_type": "app"
    }

    doc_ref = db.collection("entries").add(entry)

    # ✅ Analytics logging (placeholder)
    logging.info(f"Entry created: {doc_ref[1].id} by {author_id}")

    return jsonify({"entry_id": doc_ref[1].id, "status": "created"}), 200


@entry_bp.route("/entries", methods=["GET"])
def get_entries():
    entries = []
    docs = db.collection("entries").order_by("date_of_memory", direction=firestore.Query.DESCENDING).stream()
    for doc in docs:
        entry = doc.to_dict()
        entry["entry_id"] = doc.id
        entries.append(entry)
    return jsonify({"entries": entries}), 200


# ✅ AI Tagging Helper
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
