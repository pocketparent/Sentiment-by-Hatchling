import firebase_admin
import os
import logging
import traceback
import requests
from google.cloud import storage
from werkzeug.utils import secure_filename
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def upload_media_to_firebase(file_stream, original_filename, content_type, folder_path="uploads"):
    """
    Upload media file to Firebase Storage.
    
    Args:
        file_stream: The file stream to upload
        original_filename: Original filename
        content_type: MIME type of the file
        folder_path: Path within storage bucket
        
    Returns:
        Public URL of the uploaded file
    """
    try:
        # Secure the filename
        secure_name = secure_filename(original_filename)
        
        # Generate a unique filename to prevent collisions
        unique_id = str(uuid.uuid4())
        filename_parts = os.path.splitext(secure_name)
        unique_filename = f"{filename_parts[0]}_{unique_id}{filename_parts[1]}"
        
        # Get the storage bucket
        bucket = storage.bucket()
        
        # Create a blob and upload the file
        blob_path = f"{folder_path}/{unique_filename}"
        blob = bucket.blob(blob_path)
        
        # Set content type
        blob.content_type = content_type
        
        # Upload the file
        blob.upload_from_file(file_stream)
        
        # Make the blob publicly accessible
        blob.make_public()
        
        # Get the public URL
        public_url = blob.public_url
        
        logger.info(f"✅ File uploaded to: {public_url}")
        return public_url
        
    except Exception as e:
        logger.error(f"❌ Error uploading file to Firebase: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def download_media_from_url(url):
    """
    Download media from a URL.
    
    Args:
        url: URL of the media to download
        
    Returns:
        Tuple of (file_content, content_type)
    """
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        content_type = response.headers.get('Content-Type', 'application/octet-stream')
        
        logger.info(f"✅ Downloaded media from: {url}")
        return response.content, content_type
        
    except Exception as e:
        logger.error(f"❌ Error downloading media from URL: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def process_twilio_media(media_url):
    """
    Process media from Twilio and upload to Firebase.
    
    Args:
        media_url: Twilio media URL
        
    Returns:
        Firebase Storage URL
    """
    try:
        # Download media from Twilio
        content, content_type = download_media_from_url(media_url)
        
        # Determine file extension based on content type
        extension = '.jpg'  # Default
        if 'image/jpeg' in content_type:
            extension = '.jpg'
        elif 'image/png' in content_type:
            extension = '.png'
        elif 'image/gif' in content_type:
            extension = '.gif'
        elif 'video/' in content_type:
            extension = '.mp4'
        elif 'audio/' in content_type:
            extension = '.mp3'
            
        # Create a temporary file
        temp_filename = f"twilio_media_{uuid.uuid4()}{extension}"
        temp_path = f"/tmp/{temp_filename}"
        
        with open(temp_path, 'wb') as f:
            f.write(content)
            
        # Upload to Firebase
        with open(temp_path, 'rb') as f:
            firebase_url = upload_media_to_firebase(
                f, 
                temp_filename, 
                content_type, 
                "sms_uploads"
            )
            
        # Clean up temporary file
        os.remove(temp_path)
        
        logger.info(f"✅ Processed Twilio media to: {firebase_url}")
        return firebase_url
        
    except Exception as e:
        logger.error(f"❌ Error processing Twilio media: {str(e)}")
        logger.error(traceback.format_exc())
        return None
