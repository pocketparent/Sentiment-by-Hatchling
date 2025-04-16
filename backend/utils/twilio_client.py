import os
import logging
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import traceback
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_twilio_client() -> Optional[Client]:
    """
    Get a configured Twilio client using environment variables.
    
    Returns:
        Twilio client or None if configuration is missing
    """
    try:
        account_sid = os.environ.get("TWILIO_SID")
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        
        if not account_sid or not auth_token:
            logger.warning("⚠️ Twilio credentials not set in environment variables")
            return None
            
        client = Client(account_sid, auth_token)
        return client
    except Exception as e:
        logger.error(f"❌ Error creating Twilio client: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def send_sms(to_number: str, message: str, media_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Send an SMS message using Twilio.
    
    Args:
        to_number: The recipient's phone number in E.164 format
        message: The message content
        media_url: Optional URL to media to include in the message
        
    Returns:
        Dictionary with status and details of the operation
    """
    try:
        client = get_twilio_client()
        if not client:
            return {"success": False, "error": "Twilio client not available"}
            
        from_number = os.environ.get("TWILIO_PHONE_NUMBER")
        if not from_number:
            return {"success": False, "error": "Twilio phone number not set"}
            
        # Prepare message parameters
        params = {
            "body": message,
            "from_": from_number,
            "to": to_number
        }
        
        # Add media URL if provided
        if media_url:
            params["media_url"] = [media_url]
            
        # Send message
        message = client.messages.create(**params)
        
        logger.info(f"✅ SMS sent to {to_number}, SID: {message.sid}")
        return {
            "success": True,
            "message_sid": message.sid,
            "status": message.status
        }
        
    except TwilioRestException as e:
        logger.error(f"❌ Twilio API error: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "error": str(e),
            "code": e.code
        }
    except Exception as e:
        logger.error(f"❌ Error sending SMS: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "error": str(e)
        }

def send_ai_response(to_number: str, original_message: str) -> Dict[str, Any]:
    """
    Generate and send an AI response to an incoming SMS.
    
    Args:
        to_number: The recipient's phone number in E.164 format
        original_message: The original message content
        
    Returns:
        Dictionary with status and details of the operation
    """
    try:
        # Generate a simple acknowledgment response
        response = "Thanks for your memory! It has been saved to your Hatchling journal."
        
        # Send the response
        result = send_sms(to_number, response)
        
        if result["success"]:
            logger.info(f"✅ AI response sent to {to_number}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error sending AI response: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "error": str(e)
        }
