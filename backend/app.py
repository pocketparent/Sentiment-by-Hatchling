from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# ✅ Import this AFTER loading env vars — it initializes Firebase once
from utils import firebase  # safely initializes the Firebase app

# ✅ Import route blueprints
from routes.entry import entry_bp
from routes.auth import auth_bp
from routes.invite import invite_bp
from routes.export import export_bp

# ✅ Create and configure Flask app
app = Flask(__name__)
app.url_map.strict_slashes = False  # 🔧 Accept /api/entry and /api/entry/ the same
CORS(app, origins=["https://myhatchling.ai"])

@app.route("/", methods=["GET", "HEAD"])
def index():
    return {"status": "ok", "message": "Hatchling API is live"}, 200

# ✅ Register blueprints with /api/ prefixes
app.register_blueprint(entry_bp, url_prefix="/api/entry")
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(invite_bp, url_prefix="/api/invite")
app.register_blueprint(export_bp, url_prefix="/api/export")

if __name__ == "__main__":
    app.run(debug=True)
