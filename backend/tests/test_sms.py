import pytest
import json
from flask import Flask
from routes.sms import sms_bp

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

def test_sms_test_endpoint(client):
    """Test the SMS test endpoint with valid data."""
    test_data = {
        "phone_number": "+15551234567",
        "message": "Test message from pytest"
    }
    response = client.post("/api/sms/test", 
                          data=json.dumps(test_data),
                          content_type="application/json")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "test_complete"
    assert "result" in data

def test_sms_test_endpoint_missing_data(client):
    """Test the SMS test endpoint with missing data."""
    test_data = {
        "phone_number": "+15551234567"
        # Missing message field
    }
    response = client.post("/api/sms/test", 
                          data=json.dumps(test_data),
                          content_type="application/json")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data
