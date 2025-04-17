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
from backend.routes.admin import admin_bp

# Create a test Flask app
@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_admin_search_endpoint_no_query(client):
    """Test the admin search endpoint with missing query."""
    response = client.get("/api/admin/search")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data
