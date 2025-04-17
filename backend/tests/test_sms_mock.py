import pytest
import json
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Mock the Firebase and OpenAI dependencies
class MockFirestore:
    def client(self):
        return self

class MockOpenAI:
    def __init__(self, api_key=None):
        pass

# Create mock modules
sys.modules['firebase_admin'] = type('MockFirebaseAdmin', (), {
    'firestore': MockFirestore(),
    'initialize_app': lambda *args, **kwargs: None
})

sys.modules['openai'] = type('MockOpenAI', (), {
    'OpenAI': MockOpenAI
})

# Now import the Flask app and routes
from flask import Flask
from backend.routes.sms import sms_bp

# Create a test Flask app
@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(sms_bp, url_prefix="/api/sms")
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_sms_status_endpoint(client):
    """Test the SMS status endpoint returns correct response."""
    response = client.get("/api/sms/status")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "active"
    assert "message" in data

# More tests would be added here, but we're focusing on basic validation
