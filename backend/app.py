from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from utils import firebase  # This initializes Firebase once and sets up Firestore + Storage

import os

# Load environment variables
load_dotenv()

# Import routes after firebase is initialized
from routes.entry import entry_bp
from routes.auth import auth_bp
from routes.invite import invite_bp
from routes.export import export_bp

# Create app
app = Flask(__name__)
CORS(app, origins=["https://myhatchling.ai"])

@app.route("/", methods=["GET"])
def index():
    return
