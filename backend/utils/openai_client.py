from openai import OpenAI
import os
import tempfile
import logging
import base64

# Configure logging
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_ai_tags(content, media_url=None, media_type=None):
    """
    Generate tags for a journal entry using OpenAI.
    
    Args:
        content: The text content to generate tags for
        media_url: Optional URL to media file (image, video)
        media_type: Media MIME type
        
    Returns:
        List of generated tags
    """
    try:
        logger.info("🔍 Generating AI tags for content and media")
        
        # Skip if content is too short and no media
        if len(content.strip()) < 10 and not media_url:
            logger.info("Content too short for tag generation and no media provided")
            return []
        
        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant who extracts 3-5 short descriptive tags from a journal entry. Focus on key themes, emotions, activities, or milestones. Return only a comma-separated list of tags, no explanation."
            }
        ]
        
        # If we have an image, analyze it using vision model
        if media_url and media_type and media_type.startswith('image/'):
            try:
                # For local files that start with /
                if media_url.startswith('/'):
                    # Read the image file and encode as base64
                    with open(media_url, 'rb') as image_file:
                        image_data = base64.b64encode(image_file.read()).decode('utf-8')
                        
                    # Create a data URL
                    data_url = f"data:{media_type};base64,{image_data}"
                    
                    # Use GPT-4 Vision to analyze the image
                    messages.append({
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Please provide tags for this memory based on both the text and image:\n\n{content}"},
                            {
                                "type": "image_url",
                                "image_url": {"url": data_url}
                            }
                        ]
                    })
                    
                    # Use GPT-4 Vision model
                    response = client.chat.completions.create(
                        model="gpt-4-vision-preview",
                        messages=messages,
                        max_tokens=50,
                        temperature=0.5
                    )
                else:
                    # For remote URLs
                    messages.append({
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Please provide tags for this memory based on both the text and image:\n\n{content}"},
                            {
                                "type": "image_url",
                                "image_url": {"url": media_url}
                            }
                        ]
                    })
                    
                    # Use GPT-4 Vision model
                    response = client.chat.completions.create(
                        model="gpt-4-vision-preview",
                        messages=messages,
                        max_tokens=50,
                        temperature=0.5
                    )
                
                logger.info("Successfully analyzed image for tag generation")
                
            except Exception as e:
                logger.error(f"❌ Image analysis failed: {str(e)}")
                # Fall back to text-only analysis
                messages.append({
                    "role": "user",
                    "content": f"Please provide tags for this memory:\n\n{content}"
                })
                
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=messages,
                    max_tokens=50,
                    temperature=0.5
                )
        else:
            # Text-only analysis
            messages.append({
                "role": "user",
                "content": f"Please provide tags for this memory:\n\n{content}"
            })
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=50,
                temperature=0.5
            )
            
        raw = response.choices[0].message.content
        logger.info(f"🔁 Raw response from OpenAI: {raw}")

        # Process tags: strip whitespace, remove # symbols, lowercase
        tags = [tag.strip("#, ").lower() for tag in raw.split(",") if tag.strip()]
        
        # Limit to 5 tags maximum
        tags = tags[:5]
        
        logger.info(f"✅ Generated tags: {tags}")
        return tags
        
    except Exception as e:
        logger.error(f"❌ AI tag generation failed: {str(e)}")
        # Return empty list rather than failing the request
        return []


def transcribe_audio(file_stream):
    """
    Transcribe audio content using OpenAI Whisper.
    
    Args:
        file_stream: The audio file stream to transcribe
        
    Returns:
        Transcribed text or empty string if failed
    """
    temp_file_path = None
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            temp_file.write(file_stream.read())
            temp_file_path = temp_file.name
            
        logger.info(f"Created temporary file for transcription: {temp_file_path}")

        # Transcribe using OpenAI Whisper
        with open(temp_file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            
            transcribed_text = transcript.text.strip()
            logger.info(f"Successfully transcribed audio: {transcribed_text[:50]}...")
            return transcribed_text
            
    except Exception as e:
        logger.error(f"❌ Audio transcription failed: {str(e)}")
        return ""
        
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            logger.info(f"Removed temporary file: {temp_file_path}")

def generate_entry_summary(entries, max_entries=5):
    """
    Generate a summary of recent journal entries.
    Useful for nudges and reminders.
    
    Args:
        entries: List of entry dictionaries
        max_entries: Maximum number of entries to include in summary
        
    Returns:
        Summary text
    """
    try:
        # Limit to most recent entries
        recent_entries = entries[:max_entries]
        
        if not recent_entries:
            return "No recent entries found."
            
        # Create a prompt with recent entries
        entries_text = ""
        for i, entry in enumerate(recent_entries):
            content = entry.get("content", "")
            date = entry.get("date_of_memory", "unknown date")
            entries_text += f"Entry {i+1} ({date}): {content[:100]}...\n\n"
            
        prompt = f"Here are the most recent journal entries:\n\n{entries_text}\n\nPlease provide a brief, encouraging summary of these memories."
        
        # Generate summary
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant who summarizes journal entries in a warm, supportive tone. Keep your summary brief and highlight positive aspects or patterns."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        summary = response.choices[0].message.content.strip()
        logger.info(f"Generated entry summary: {summary[:50]}...")
        return summary
        
    except Exception as e:
        logger.error(f"❌ Entry summary generation failed: {str(e)}")
        return "Unable to generate summary at this time."
