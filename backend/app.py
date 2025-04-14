from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials
from utils import firebase  # Initializes Firebase with env vars

import os

# Load environment variables
load_dotenv()

# ✅ Initialize Firebase
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n'),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL")
})
firebase_admin.initialize_app(cred, {
    "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET")
})

# ✅ Now import your routes
from routes.entry import entry_bp
from routes.auth import auth_bp
from routes.invite import invite_bp
from routes.export import export_bp

# Create app
app = Flask(__name__)
CORS(app, origins=["https://myhatchling.ai"])

@app.route("/", methods=["GET"])
def index():
    return {"status": "ok", "message": "Hatchling API is live"}, 200

app.register_blueprint(entry_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(invite_bp)
app.register_blueprint(export_bp)

if __name__ == "__main__":
    app.run(debug=True)
