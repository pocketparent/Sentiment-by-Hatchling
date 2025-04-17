import pytest
import json
from flask import Flask
from routes.admin import admin_bp

# Create a test Flask app
@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_admin_users_endpoint(client):
    """Test the admin users endpoint returns correct response."""
    response = client.get("/api/admin/users")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "users" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data

def test_admin_subscriptions_endpoint(client):
    """Test the admin subscriptions endpoint returns correct response."""
    response = client.get("/api/admin/subscriptions")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "subscriptions" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data

def test_admin_search_endpoint_no_query(client):
    """Test the admin search endpoint with missing query."""
    response = client.get("/api/admin/search")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data

def test_admin_search_endpoint_with_query(client):
    """Test the admin search endpoint with valid query."""
    response = client.get("/api/admin/search?q=test")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "users" in data
    assert "subscriptions" in data
    assert "entries" in data

def test_admin_stats_endpoint(client):
    """Test the admin stats endpoint returns correct response."""
    response = client.get("/api/admin/stats")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "users" in data
    assert "subscriptions" in data
    assert "entries" in data
    assert "timestamp" in data
