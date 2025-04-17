import os
from firebase_admin import storage
from werkzeug.utils import secure_filename
import uuid
import logging
from datetime import datetime, timedelta

# Configure logging
logger = logging.getLogger(__name__)

def upload_media_to_firebase(file_stream, filename, content_type, folder_path="uploads"):
    """
    Upload media file to Firebase Storage with organized folder structure.
    
    Args:
        file_stream: The file stream to upload
        filename: Original filename
        content_type: MIME type of the file
        folder_path: Path within storage bucket (default: "uploads")
        
    Returns:
        Signed URL for accessing the uploaded file
    """
    try:
        bucket = storage.bucket(os.getenv("FIREBASE_STORAGE_BUCKET"))
        
        # Create a unique filename to prevent collisions
        unique_filename = f"{uuid.uuid4().hex}_{secure_filename(filename)}"
        
        # Create full path with folder structure
        full_path = f"{folder_path}/{unique_filename}"
        
        # Create blob and upload
        blob = bucket.blob(full_path)
        blob.upload_from_file(file_stream, content_type=content_type)
        
        # Set appropriate metadata
        metadata = {
            'contentType': content_type,
            'uploadTime': datetime.now().isoformat()
        }
        blob.metadata = metadata
        blob.patch()
        
        # Set appropriate access control
        blob.make_private()
        
        # Generate signed URL with longer expiration (7 days)
        expiration_time = datetime.now() + timedelta(days=7)
        signed_url = blob.generate_signed_url(
            expiration=int(expiration_time.timestamp()),
            method='GET'
        )
        
        logger.info(f"Media uploaded successfully to {full_path}")
        return signed_url
        
    except Exception as e:
        logger.error(f"Error uploading media to Firebase: {str(e)}")
        raise

def delete_media_from_firebase(media_url):
    """
    Delete media file from Firebase Storage based on URL.
    
    Args:
        media_url: The signed URL of the file to delete
        
    Returns:
        Boolean indicating success
    """
    try:
        # Extract the path from the URL
        # This is a simplified approach and may need adjustment based on URL format
        bucket = storage.bucket(os.getenv("FIREBASE_STORAGE_BUCKET"))
        
        # Parse the URL to extract the blob path
        # Example URL: https://storage.googleapis.com/bucket-name.appspot.com/path/to/file?token=...
        url_parts = media_url.split('?')[0]  # Remove query parameters
        path_parts = url_parts.split(f"{bucket.name}.appspot.com/")
        
        if len(path_parts) < 2:
            logger.error(f"Could not parse blob path from URL: {media_url}")
            return False
            
        blob_path = path_parts[1]
        blob = bucket.blob(blob_path)
        
        if not blob.exists():
            logger.warning(f"Blob does not exist: {blob_path}")
            return False
            
        blob.delete()
        logger.info(f"Media deleted successfully: {blob_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error deleting media from Firebase: {str(e)}")
        return False

def get_media_metadata(media_url):
    """
    Get metadata for a media file in Firebase Storage.
    
    Args:
        media_url: The signed URL of the file
        
    Returns:
        Dictionary of metadata or None if error
    """
    try:
        # Extract the path from the URL
        bucket = storage.bucket(os.getenv("FIREBASE_STORAGE_BUCKET"))
        
        # Parse the URL to extract the blob path
        url_parts = media_url.split('?')[0]  # Remove query parameters
        path_parts = url_parts.split(f"{bucket.name}.appspot.com/")
        
        if len(path_parts) < 2:
            logger.error(f"Could not parse blob path from URL: {media_url}")
            return None
            
        blob_path = path_parts[1]
        blob = bucket.blob(blob_path)
        
        if not blob.exists():
            logger.warning(f"Blob does not exist: {blob_path}")
            return None
            
        blob.reload()  # Ensure we have the latest metadata
        
        metadata = {
            'name': blob.name,
            'bucket': blob.bucket.name,
            'size': blob.size,
            'content_type': blob.content_type,
            'time_created': blob.time_created,
            'updated': blob.updated,
            'custom_metadata': blob.metadata
        }
        
        return metadata
        
    except Exception as e:
        logger.error(f"Error getting media metadata: {str(e)}")
        return None
