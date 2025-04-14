# utils/sms.py
from twilio.rest import Client
import os

def send_login_link(phone, token):
    client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_AUTH"))
    url = f"https://myhatchling.ai/login?token={token}"
    message = f"Tap to log in to Hatchling: {url}"
    client.messages.create(to=phone, from_=os.getenv("TWILIO_NUMBER"), body=message)
