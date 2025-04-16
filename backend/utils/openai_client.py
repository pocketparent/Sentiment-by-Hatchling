import os
import openai
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_ai_tags(content, max_tags=5):
    """
    Generate AI tags for content using OpenAI API.
    
    Args:
        content (str): The text content to generate tags for
        max_tags (int): Maximum number of tags to return
        
    Returns:
        list: List of generated tags
    """
    try:
        # Skip if content is too short
        if not content or len(content.strip()) < 10:
            logger.warning("Content too short for AI tag generation")
            return ["memory"]
            
        logger.info("🤖 Generating AI tags for content")
        
        # Check if OpenAI API key is configured
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OpenAI API key not configured, using default tags")
            return ["memory", "moment", "experience"]
            
        # Call OpenAI API
        openai.api_key = api_key
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that generates relevant tags for journal entries. Generate 3-5 single-word tags that capture the essence of the content. Return only the tags as a comma-separated list without any additional text."
                    },
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                max_tokens=50,
                temperature=0.7,
            )
            
            # Process the response to extract tags
            tag_text = response.choices[0].message["content"].strip()
            tags = [tag.strip().lower() for tag in tag_text.split(',')]
            tags = [tag for tag in tags if tag and len(tag) < 20][:max_tags]  # Limit to max_tags
            
            logger.info(f"✅ AI tags generated: {tags}")
            return tags
            
        except Exception as e:
            logger.error(f"❌ OpenAI API call failed: {str(e)}")
            # Fallback to content-based tag generation
            return generate_content_based_tags(content, max_tags)
            
    except Exception as e:
        logger.error(f"❌ Error in get_ai_tags: {str(e)}")
        return ["memory", "moment"]

def generate_content_based_tags(content, max_tags=5):
    """
    Generate tags based on content keywords as a fallback.
    
    Args:
        content (str): The text content to generate tags for
        max_tags (int): Maximum number of tags to return
        
    Returns:
        list: List of generated tags
    """
    logger.info("⚠️ Using content-based tag generation as fallback")
    
    # Simple content-based tag generation
    content_lower = content.lower()
    generated_tags = []
    
    # Check for common themes in content
    tag_mappings = {
        'first': ['milestone', 'first'],
        'smile': ['milestone', 'emotion'],
        'laugh': ['joy', 'emotion'],
        'walk': ['milestone', 'development'],
        'crawl': ['milestone', 'development'],
        'talk': ['milestone', 'development', 'communication'],
        'eat': ['food', 'nutrition'],
        'sleep': ['rest', 'routine'],
        'play': ['activity', 'fun'],
        'friend': ['social', 'relationship'],
        'school': ['education', 'learning'],
        'doctor': ['health', 'checkup'],
        'sick': ['health', 'care'],
        'birthday': ['celebration', 'milestone'],
        'holiday': ['celebration', 'family'],
        'trip': ['travel', 'adventure'],
        'park': ['outdoor', 'activity'],
        'swim': ['activity', 'skill'],
        'read': ['learning', 'development'],
        'sing': ['music', 'expression'],
        'dance': ['movement', 'expression'],
        'draw': ['art', 'creativity'],
        'paint': ['art', 'creativity'],
        'build': ['creativity', 'skill'],
        'help': ['responsibility', 'growth'],
        'share': ['social', 'development'],
        'love': ['emotion', 'relationship'],
        'happy': ['emotion', 'joy'],
        'sad': ['emotion', 'feeling'],
        'angry': ['emotion', 'feeling'],
        'scared': ['emotion', 'feeling'],
        'proud': ['emotion', 'achievement'],
        'excited': ['emotion', 'anticipation']
    }
    
    # Check content for keywords and add corresponding tags
    for keyword, tags in tag_mappings.items():
        if keyword in content_lower:
            for tag in tags:
                if tag not in generated_tags:
                    generated_tags.append(tag)
    
    # If no specific tags found, add some general ones
    if not generated_tags:
        generated_tags.append('moment')
        generated_tags.append('memory')
    
    # Limit to max_tags
    limited_tags = generated_tags[:max_tags]
    logger.info(f"✅ Content-based tags generated: {limited_tags}")
    
    return limited_tags

def transcribe_audio(audio_file):
    """
    Transcribe audio file using OpenAI Whisper API.
    
    Args:
        audio_file: File-like object containing audio data
        
    Returns:
        str: Transcribed text
    """
    try:
        logger.info("🎤 Transcribing audio file")
        
        # Check if OpenAI API key is configured
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OpenAI API key not configured, skipping transcription")
            return "Audio transcription unavailable"
            
        # Call OpenAI API
        openai.api_key = api_key
        
        try:
            response = openai.Audio.transcribe(
                model="whisper-1",
                file=audio_file
            )
            
            transcription = response.get("text", "")
            logger.info(f"✅ Audio transcribed: {transcription[:50]}...")
            return transcription
            
        except Exception as e:
            logger.error(f"❌ OpenAI transcription failed: {str(e)}")
            return "Audio transcription failed"
            
    except Exception as e:
        logger.error(f"❌ Error in transcribe_audio: {str(e)}")
        return "Audio transcription error"

def generate_entry_summary(entry_content, max_length=100):
    """
    Generate a summary of entry content for nudges.
    
    Args:
        entry_content (str): The full entry content
        max_length (int): Maximum length of summary
        
    Returns:
        str: Summarized content
    """
    try:
        # If content is already short, return it directly
        if len(entry_content) <= max_length:
            return entry_content
            
        logger.info("📝 Generating entry summary")
        
        # Check if OpenAI API key is configured
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OpenAI API key not configured, using simple summary")
            # Simple truncation with ellipsis
            return entry_content[:max_length - 3] + "..."
            
        # Call OpenAI API
        openai.api_key = api_key
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": f"Summarize the following journal entry in {max_length} characters or less. Preserve the emotional tone and key details."
                    },
                    {
                        "role": "user",
                        "content": entry_content
                    }
                ],
                max_tokens=100,
                temperature=0.7,
            )
            
            summary = response.choices[0].message["content"].strip()
            logger.info(f"✅ Summary generated: {summary}")
            return summary
            
        except Exception as e:
            logger.error(f"❌ OpenAI summary generation failed: {str(e)}")
            # Fallback to simple truncation
            return entry_content[:max_length - 3] + "..."
            
    except Exception as e:
        logger.error(f"❌ Error in generate_entry_summary: {str(e)}")
        return entry_content[:max_length - 3] + "..."

