import pytest
import json
from flask import Flask
from routes.stripe_routes import stripe_routes_bp

# Create a test Flask app
@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(stripe_routes_bp, url_prefix="/api/subscription")
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_subscription_status_endpoint(client):
    """Test the subscription status endpoint with valid user_id."""
    response = client.get("/api/subscription/status?user_id=test_user")
    assert response.status_code == 404  # User not found is expected in test environment
    data = json.loads(response.data)
    assert "error" in data

def test_subscription_status_endpoint_missing_user_id(client):
    """Test the subscription status endpoint with missing user_id."""
    response = client.get("/api/subscription/status")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data
    assert "Missing user_id" in data["error"]

def test_subscription_setup_endpoint(client):
    """Test the subscription setup endpoint with valid data."""
    test_data = {
        "user_id": "test_user",
        "plan_type": "monthly",
        "payment_method_id": "pm_test_123456"
    }
    response = client.post("/api/subscription/setup", 
                          data=json.dumps(test_data),
                          content_type="application/json")
    assert response.status_code == 404  # User not found is expected in test environment
    data = json.loads(response.data)
    assert "error" in data

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
