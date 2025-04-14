from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging

from routes.entry import entry_bp
from routes.auth import auth_bp
from routes.invite import invite_bp
from routes.export import export_bp

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)

    # Configure CORS
    CORS(app, origins=[os.getenv("FRONTEND_ORIGIN", "https://myhatchling.ai")])

    # Basic Logging
    logging.basicConfig(level=logging.INFO)
    app.logger.info("Hatchling backend starting up...")

    # Health check route
    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "status": "ok",
            "message": "Hatchling API is live"
        }), 200

    # Register blueprints
    app.register_blueprint(entry_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(invite_bp)
    app.register_blueprint(export_bp)

    return app

# Production entry point
app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
