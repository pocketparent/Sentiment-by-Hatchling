import os
import requests
from firebase_admin import storage
from werkzeug.utils import secure_filename

def download_media_from_url(url, local_path=None):
    """Download media from a URL to a local path"""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        if not local_path:
            # Create a temporary file if no path provided
            filename = secure_filename(os.path.basename(url.split('?')[0]))
            local_path = os.path.join('/tmp', filename)
        
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return local_path
    except Exception as e:
        print(f"Error downloading media: {e}")
        return None

def upload_media_to_firebase(file_path, destination_path):
    """Upload a file to Firebase Storage"""
    try:
        bucket = storage.bucket()
        blob = bucket.blob(destination_path)
        blob.upload_from_filename(file_path)
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"Error uploading to Firebase: {e}")
        return None
