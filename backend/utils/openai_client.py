from openai import OpenAI
import os
import tempfile

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_ai_tags(content):
    try:
        print("🔍 Sending AI prompt...")
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant who extracts 3-5 short descriptive tags from a journal entry. Return only a comma-separated list of tags, no explanation."
                },
                {
                    "role": "user",
                    "content": f"Please provide tags for this memory:\n\n{content}"
                }
            ],
            max_tokens=50,
            temperature=0.5
        )
        raw = response.choices[0].message.content
        print("🔁 Raw response from OpenAI:", raw)

        tags = [tag.strip("#, ").lower() for tag in raw.split(",") if tag.strip()]
        print("✅ Parsed tags:", tags)
        return tags[:5]
    except Exception as e:
        print("❌ AI tag generation failed:", e)
        return []


def transcribe_audio(file_stream):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            temp_file.write(file_stream.read())
            temp_file_path = temp_file.name

        with open(temp_file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            return transcript.text.strip()
    except Exception as e:
        print("Audio transcription failed:", e)
        return ""
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
