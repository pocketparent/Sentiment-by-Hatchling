import os
from firebase_admin import storage
from werkzeug.utils import secure_filename
import uuid

def upload_media_to_firebase(file_stream, filename, content_type):
    bucket = storage.bucket()
    unique_filename = f"{uuid.uuid4().hex}_{secure_filename(filename)}"
    blob = bucket.blob(unique_filename)

    blob.upload_from_file(file_stream, content_type=content_type)
    blob.make_private()

    signed_url = blob.generate_signed_url(expiration=3600)  # 1 hour
    return signed_url
