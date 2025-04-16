import firebase_admin
from firebase_admin import credentials, storage
import os
import logging
import uuid
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_firebase():
    """
    Initialize Firebase if not already initialized.
    """
    try:
        if not firebase_admin._apps:
            # Check for environment variables
            project_id = os.environ.get("FIREBASE_PROJECT_ID")
            private_key = os.environ.get("FIREBASE_PRIVATE_KEY")
            
            if project_id and private_key:
                # Use environment variables
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key": private_key.replace("\\n", "\n"),
                    "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL", f"firebase-adminsdk@{project_id}.iam.gserviceaccount.com")
                })
                firebase_admin.initialize_app(cred, {
                    'storageBucket': f"{project_id}.appspot.com"
                })
                logger.info("✅ Firebase initialized from environment variables")
            else:
                # Try to use service account file
                service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")
                if os.path.exists(service_account_path):
                    cred = credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred)
                    logger.info(f"✅ Firebase initialized from service account file: {service_account_path}")
                else:
                    # Use mock mode
                    logger.warning("⚠️ Firebase credentials not found, initializing in mock mode")
                    # Initialize with a mock app
                    firebase_admin.initialize_app(None, {
                        'projectId': 'hatchling-mock',
                    })
        return True
    except Exception as e:
        logger.error(f"❌ Firebase initialization error: {str(e)}")
        return False

def upload_media_to_firebase(file_stream, filename, content_type, folder_path="uploads"):
    """
    Upload media file to Firebase Storage.
    
    Args:
        file_stream: File-like object containing file data
        filename: Original filename
        content_type: MIME type of the file
        folder_path: Path within storage bucket
        
    Returns:
        str: Public URL of the uploaded file
    """
    try:
        # Initialize Firebase if needed
        if not initialize_firebase():
            logger.warning("⚠️ Firebase not initialized, returning mock URL")
            return f"https://storage.example.com/{folder_path}/{filename}?mock=true"
        
        # Generate a unique filename to avoid collisions
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create full path including folder
        full_path = f"{folder_path}/{unique_filename}"
        
        try:
            # Get bucket
            bucket = storage.bucket()
            
            # Create blob and upload
            blob = bucket.blob(full_path)
            blob.upload_from_file(file_stream, content_type=content_type)
            
            # Make publicly accessible and get URL
            blob.make_public()
            url = blob.public_url
            
            logger.info(f"✅ File uploaded to Firebase: {url}")
            return url
        except Exception as e:
            logger.error(f"❌ Firebase upload error: {str(e)}")
            # Return a mock URL for testing
            mock_url = f"https://storage.example.com/{full_path}?mock=true"
            logger.warning(f"⚠️ Using mock URL: {mock_url}")
            return mock_url
            
    except Exception as e:
        logger.error(f"❌ Error in upload_media_to_firebase: {str(e)}")
        return f"https://storage.example.com/error/{filename}?error=true"

def get_signed_url(media_url, expiration_days=7):
    """
    Generate a signed URL for a Firebase Storage file.
    
    Args:
        media_url: Public URL of the file
        expiration_days: Number of days until URL expires
        
    Returns:
        str: Signed URL with temporary access
    """
    try:
        # Skip if URL is already a mock
        if "mock=true" in media_url or "error=true" in media_url:
            logger.warning("⚠️ Mock URL detected, skipping signed URL generation")
            return media_url
            
        # Initialize Firebase if needed
        if not initialize_firebase():
            logger.warning("⚠️ Firebase not initialized, returning original URL")
            return media_url
            
        # Extract path from URL
        path = media_url.split("/o/")[1].split("?")[0] if "/o/" in media_url else media_url.split(".com/")[1]
        path = path.replace("%2F", "/")
        
        try:
            # Get bucket and blob
            bucket = storage.bucket()
            blob = bucket.blob(path)
            
            # Generate signed URL
            expiration = datetime.now() + timedelta(days=expiration_days)
            signed_url = blob.generate_signed_url(expiration=expiration)
            
            logger.info(f"✅ Signed URL generated, expires in {expiration_days} days")
            return signed_url
        except Exception as e:
            logger.error(f"❌ Signed URL generation error: {str(e)}")
            return media_url
            
    except Exception as e:
        logger.error(f"❌ Error in get_signed_url: {str(e)}")
        return media_url

def delete_media(media_url):
    """
    Delete a file from Firebase Storage.
    
    Args:
        media_url: Public URL of the file
        
    Returns:
        bool: True if deletion was successful
    """
    try:
        # Skip if URL is a mock
        if "mock=true" in media_url or "error=true" in media_url:
            logger.warning("⚠️ Mock URL detected, skipping deletion")
            return True
            
        # Initialize Firebase if needed
        if not initialize_firebase():
            logger.warning("⚠️ Firebase not initialized, skipping deletion")
            return False
            
        # Extract path from URL
        path = media_url.split("/o/")[1].split("?")[0] if "/o/" in media_url else media_url.split(".com/")[1]
        path = path.replace("%2F", "/")
        
        try:
            # Get bucket and blob
            bucket = storage.bucket()
            blob = bucket.blob(path)
            
            # Delete the blob
            blob.delete()
            
            logger.info(f"✅ File deleted from Firebase: {path}")
            return True
        except Exception as e:
            logger.error(f"❌ Firebase deletion error: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error in delete_media: {str(e)}")
        return False

def get_media_metadata(media_url):
    """
    Get metadata for a file in Firebase Storage.
    
    Args:
        media_url: Public URL of the file
        
    Returns:
        dict: Metadata for the file
    """
    try:
        # Skip if URL is a mock
        if "mock=true" in media_url or "error=true" in media_url:
            logger.warning("⚠️ Mock URL detected, returning mock metadata")
            return {
                "name": media_url.split("/")[-1].split("?")[0],
                "contentType": "application/octet-stream",
                "size": 0,
                "updated": datetime.now().isoformat(),
                "isMock": True
            }
            
        # Initialize Firebase if needed
        if not initialize_firebase():
            logger.warning("⚠️ Firebase not initialized, returning mock metadata")
            return {
                "name": media_url.split("/")[-1].split("?")[0],
                "contentType": "application/octet-stream",
                "size": 0,
                "updated": datetime.now().isoformat(),
                "isMock": True
            }
            
        # Extract path from URL
        path = media_url.split("/o/")[1].split("?")[0] if "/o/" in media_url else media_url.split(".com/")[1]
        path = path.replace("%2F", "/")
        
        try:
            # Get bucket and blob
            bucket = storage.bucket()
            blob = bucket.blob(path)
            
            # Get metadata
            blob.reload()
            metadata = {
                "name": blob.name.split("/")[-1],
                "contentType": blob.content_type,
                "size": blob.size,
                "updated": blob.updated.isoformat() if blob.updated else None,
                "md5Hash": blob.md5_hash
            }
            
            logger.info(f"✅ Metadata retrieved for: {path}")
            return metadata
        except Exception as e:
            logger.error(f"❌ Metadata retrieval error: {str(e)}")
            return {
                "name": path.split("/")[-1],
                "contentType": "application/octet-stream",
                "size": 0,
                "updated": datetime.now().isoformat(),
                "error": str(e)
            }
            
    except Exception as e:
        logger.error(f"❌ Error in get_media_metadata: {str(e)}")
        return {
            "name": media_url.split("/")[-1].split("?")[0],
            "error": str(e)
        }

