import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

def get_ai_tags(content):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant who extracts relevant one-word memory tags from journal entries. Only return tags, no explanation."},
                {"role": "user", "content": f"Please provide 3-5 descriptive tags for the following memory:\n\n{content}"}
            ],
            max_tokens=50,
            temperature=0.5
        )
        raw = response['choices'][0]['message']['content']
        tags = [tag.strip("#, ").lower() for tag in raw.split() if tag.strip()]
        return tags[:5]  # limit to 5
    except Exception as e:
        print("AI tag generation failed:", e)
        return []
