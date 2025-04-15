from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
import os

# ✅ Load environment variables from .env
load_dotenv()

# ✅ Initialize Firebase (must be after env loaded)
from utils import firebase

# ✅ Import route blueprints
from routes.entry import entry_bp
from routes.auth import auth_bp
from routes.invite import invite_bp
from routes.export import export_bp

# ✅ Create Flask app
app = Flask(__name__)
app.url_map.strict_slashes = False  # Accept /api/entry and /api/entry/

# ✅ CORS Configuration (production + local dev)
CORS(app,
     origins=[
         "https://myhatchling.ai",
         "https://www.myhatchling.ai",
         "http://localhost:5173",
         "http://127.0.0.1:5173"
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])

# ✅ Health check
@app.route("/", methods=["GET", "HEAD"])
def index():
    return {"status": "ok", "message": "Hatchling API is live"}, 200

# ✅ Debug route to see registered endpoints
@app.route("/debug-routes")
def debug_routes():
    return {
        "message": "✅ Backend is alive and routes are registered.",
        "routes": [str(rule) for rule in app.url_map.iter_rules()]
    }

# ✅ Register all blueprints with correct prefixes
app.register_blueprint(entry_bp, url_prefix="/api/entry")
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(invite_bp, url_prefix="/api/invite")
app.register_blueprint(export_bp, url_prefix="/api/export")

# ✅ Start the app
if __name__ == "__main__":
    app.run(debug=True)
