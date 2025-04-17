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
from backend.routes.stripe_routes import stripe_routes_bp

# Create a test Flask app
@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(stripe_routes_bp, url_prefix="/api/subscription")
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_subscription_setup_endpoint_invalid_plan(client):
    """Test the subscription setup endpoint with invalid plan type."""
    test_data = {
        "user_id": "test_user",
        "plan_type": "invalid_plan",
        "payment_method_id": "pm_test_123456"
    }
    response = client.post("/api/subscription/setup", 
                          data=json.dumps(test_data),
                          content_type="application/json")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data
    assert "Invalid plan type" in data["error"]
