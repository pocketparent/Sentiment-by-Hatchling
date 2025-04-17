from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ✅ Load environment variables from .env
load_dotenv()

# ✅ Initialize Firebase (must be after env loaded)
from utils import firebase

# ✅ Import route blueprints
from routes.entry import entry_bp
from routes.auth import auth_bp
from routes.invite import invite_bp
from routes.export import export_bp
from routes.nudge import nudge_bp
from routes.stripe_webhooks import stripe_bp
from routes.sms import sms_bp
from routes.stripe_routes import stripe_routes_bp
from routes.admin import admin_bp

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
     allow_headers=["Content-Type", "Authorization", "X-User-ID"],
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
app.register_blueprint(nudge_bp, url_prefix="/api/nudge")
app.register_blueprint(stripe_bp, url_prefix="/stripe")
app.register_blueprint(sms_bp, url_prefix="/api/sms")
app.register_blueprint(stripe_routes_bp, url_prefix="/api/subscription")
app.register_blueprint(admin_bp, url_prefix="/api/admin")

# Log registered routes
logger.info("Registered routes:")
for rule in app.url_map.iter_rules():
    logger.info(f"Route: {rule}")

# ✅ Start the app
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

