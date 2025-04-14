import uuid
from firebase_admin import storage

def upload_media_to_firebase(file_stream, filename=None, content_type="image/jpeg"):
    if not filename:
        filename = f"{uuid.uuid4()}.jpg"  # Adjust extension/type if needed

    bucket = storage.bucket()
    blob = bucket.blob(f"uploads/{filename}")
    blob.upload_from_file(file_stream, content_type=content_type)

    # Make it private and use signed URL
    url = blob.generate_signed_url(expiration=3600)  # 1 hour
    return url
