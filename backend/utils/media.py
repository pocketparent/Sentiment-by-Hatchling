from utils.media import download_media_from_url, upload_media_to_firebase
import requests
import io
import logging
import traceback
from typing import Optional, Dict, Any, BinaryIO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_media_from_url(url: str) -> Optional[BinaryIO]:
    """
    Download media from a URL and return as a binary stream.
    
    Args:
        url: The URL to download media from
        
    Returns:
        Binary stream of the media or None if download fails
    """
    try:
        logger.info(f"📥 Downloading media from URL: {url}")
        
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Raise exception for 4XX/5XX responses
        
        # Create a binary stream from the response content
        media_stream = io.BytesIO(response.content)
        
        logger.info(f"✅ Media downloaded successfully: {len(response.content)} bytes")
        return media_stream
        
    except requests.RequestException as e:
        logger.error(f"❌ Error downloading media: {str(e)}")
        logger.error(traceback.format_exc())
        return None
    except Exception as e:
        logger.error(f"❌ Unexpected error downloading media: {str(e)}")
        logger.error(traceback.format_exc())
        return None
