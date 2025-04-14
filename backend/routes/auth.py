from flask import Blueprint, request, jsonify
from twilio.rest import Client
import os
import random

auth_bp = Blueprint("auth", __name__)

# Temporary in-memory store (replace with DB or Redis in production)
login_tokens = {}

@auth_bp.route("/auth/request-login", methods=["POST"])
def request_login():
    phone = request.json.get("phone")
    if not phone:
        return jsonify({"error": "Phone number required"}), 400

    token = str(random.randint(100000, 999999))
    login_tokens[phone] = token

    client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
    client.messages.create(
        body=f"Your Hatchling login code: {token}",
        from_=os.getenv("TWILIO_PHONE_NUMBER"),
        to=phone
    )

    return jsonify({"status": "sent"}), 200
