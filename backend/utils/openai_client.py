import openai
import os
import logging
import traceback
from typing import List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_ai_tags(content: str) -> List[str]:
    """
    Generate tags for content using OpenAI.
    
    Args:
        content: The text content to generate tags for
        
    Returns:
        List of generated tags
    """
    try:
        # Check if OpenAI API key is set
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("⚠️ OpenAI API key not set, using fallback tags")
            return generate_fallback_tags(content)
            
        # Set up OpenAI client
        openai.api_key = api_key
        
        # Prepare prompt
        prompt = f"""
        Generate 3-5 relevant tags for the following journal entry about a child. 
        Tags should be single words or short phrases that categorize the content.
        Focus on developmental milestones, activities, emotions, or events.
        Return only the tags as a comma-separated list with no additional text.
        
        Journal entry: {content}
        """
        
        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates relevant tags for journal entries about children."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100,
            temperature=0.5
        )
        
        # Extract tags from response
        tags_text = response.choices[0].message.content.strip()
        
        # Split by comma and clean up
        tags = [tag.strip() for tag in tags_text.split(',') if tag.strip()]
        
        # Limit to 5 tags
        tags = tags[:5]
        
        logger.info(f"✅ Generated {len(tags)} tags with OpenAI")
        return tags
        
    except Exception as e:
        logger.error(f"❌ Error generating tags with OpenAI: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Use fallback tag generation
        return generate_fallback_tags(content)

def generate_fallback_tags(content: str) -> List[str]:
    """
    Generate basic tags based on content keywords when OpenAI is unavailable.
    
    Args:
        content: The text content to generate tags for
        
    Returns:
        List of generated tags
    """
    content = content.lower()
    tags = []
    
    # Check for common keywords
    if any(word in content for word in ["baby", "infant", "newborn"]):
        tags.append("baby")
    if any(word in content for word in ["sleep", "nap", "bedtime"]):
        tags.append("sleep")
    if any(word in content for word in ["food", "eat", "feeding", "meal"]):
        tags.append("food")
    if any(word in content for word in ["smile", "laugh", "happy", "joy"]):
        tags.append("happy")
    if any(word in content for word in ["cry", "sad", "upset", "tears"]):
        tags.append("emotional")
    if any(word in content for word in ["walk", "crawl", "stand", "step"]):
        tags.append("milestone")
    if any(word in content for word in ["doctor", "sick", "health", "medicine"]):
        tags.append("health")
    if any(word in content for word in ["play", "toy", "game", "fun"]):
        tags.append("play")
    if any(word in content for word in ["family", "mom", "dad", "parent"]):
        tags.append("family")
    
    # Add a default tag if none were found
    if not tags:
        tags.append("memory")
        
    logger.info(f"✅ Generated {len(tags)} fallback tags")
    return tags

def transcribe_audio(audio_file) -> Optional[str]:
    """
    Transcribe audio file using OpenAI Whisper API.
    
    Args:
        audio_file: The audio file to transcribe
        
    Returns:
        Transcription text or None if transcription fails
    """
    try:
        # Check if OpenAI API key is set
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("⚠️ OpenAI API key not set, skipping transcription")
            return None
            
        # Set up OpenAI client
        openai.api_key = api_key
        
        # Call OpenAI API
        response = openai.Audio.transcribe("whisper-1", audio_file)
        
        # Extract transcription
        transcription = response.get("text", "").strip()
        
        if transcription:
            logger.info(f"✅ Transcribed audio: {transcription[:50]}...")
            return transcription
        else:
            logger.warning("⚠️ Empty transcription returned")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error transcribing audio: {str(e)}")
        logger.error(traceback.format_exc())
        return None
