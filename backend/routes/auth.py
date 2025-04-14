from flask import Blueprint, request, jsonify
from twilio.rest import Client
import os
import random

auth_bp = Blueprint("auth", __name__)

# Temporary in-memory store (replace with DB or Redis in production)
login_tokens = {}

@auth_bp.route("/invite/send", methods=["POST"])
def send_invite():
    phone = request.json.get("phone")
    role = request.json.get("role", "caregiver")
    inviter_id = request.json.get("inviter_id")
    journal_id = request.json.get("journal_id")

    if not phone or not inviter_id or not journal_id:
        return jsonify({"error": "Missing required fields"}), 400

    invite_token = str(random.randint(100000, 999999))
    login_tokens[phone] = invite_token

    invite_url = f"https://myhatchling.ai/login?token={invite_token}&journal={journal_id}&role={role}"
    message = f"You've been invited to Hatchling! Tap to join: {invite_url}"

    client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
    client.messages.create(
        body=message,
        from_=os.getenv("TWILIO_PHONE_NUMBER"),
        to=phone
    )

    return jsonify({"status": "invite_sent"}), 200

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

@auth_bp.route("/auth/verify-token", methods=["POST"])
def verify_token():
    phone = request.json.get("phone")
    token = request.json.get("token")

    if not phone or not token:
        return jsonify({"error": "Phone and token required"}), 400

    expected_token = login_tokens.get(phone)
    if expected_token != token:
        return jsonify({"success": False, "error": "Invalid token"}), 401

    # Simulated user data (replace with real user DB lookup later)
    user_id = f"user_{phone[-4:]}"
    role = "parent"  # default until invite flow stores roles persistently
    journal_id = "demo-journal"
    is_new_user = True  # stub — change once user DB exists

    return jsonify({
        "success": True,
        "user_id": user_id,
        "role": role,
        "journal_id": journal_id,
        "is_new_user": is_new_user
    }), 200
