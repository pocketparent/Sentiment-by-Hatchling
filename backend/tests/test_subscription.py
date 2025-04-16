import pytest
import json
from unittest.mock import patch, MagicMock
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@patch('routes.subscription.create_customer')
@patch('routes.subscription.g')
def test_create_customer(mock_g, mock_create_customer, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock create_customer function
    mock_create_customer.return_value = {
        'success': True,
        'customer_id': 'cus_test123',
        'email': 'test@example.com'
    }
    
    # Make request
    response = client.post(
        '/api/subscription/create-customer',
        json={
            'user_id': 'test_user_id',
            'email': 'test@example.com',
            'name': 'Test User'
        },
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['customer_id'] == 'cus_test123'
    
    # Verify create_customer was called with correct args
    mock_create_customer.assert_called_with('test_user_id', 'test@example.com', 'Test User')

@patch('routes.subscription.create_subscription')
@patch('routes.subscription.g')
def test_create_subscription(mock_g, mock_create_subscription, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock create_subscription function
    mock_create_subscription.return_value = {
        'success': True,
        'subscription_id': 'sub_test123',
        'status': 'trialing',
        'trial_end': 1714675200,
        'customer_id': 'cus_test123'
    }
    
    # Make request
    response = client.post(
        '/api/subscription/create-subscription',
        json={
            'customer_id': 'cus_test123',
            'price_id': 'price_test123',
            'trial_days': 14
        },
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['subscription_id'] == 'sub_test123'
    assert data['status'] == 'trialing'
    
    # Verify create_subscription was called with correct args
    mock_create_subscription.assert_called_with('cus_test123', 'price_test123', 14)

@patch('routes.subscription.get_subscription_status')
@patch('routes.subscription.g')
def test_get_subscription_status(mock_g, mock_get_status, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock get_subscription_status function
    mock_get_status.return_value = {
        'success': True,
        'subscription_id': 'sub_test123',
        'status': 'active',
        'current_period_end': 1714675200,
        'trial_end': None,
        'cancel_at_period_end': False
    }
    
    # Make request
    response = client.get('/api/subscription/status/sub_test123')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['subscription_id'] == 'sub_test123'
    assert data['status'] == 'active'
    
    # Verify get_subscription_status was called with correct args
    mock_get_status.assert_called_with('sub_test123')

@patch('routes.subscription.cancel_subscription')
@patch('routes.subscription.g')
def test_cancel_subscription(mock_g, mock_cancel_subscription, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock cancel_subscription function
    mock_cancel_subscription.return_value = {
        'success': True,
        'subscription_id': 'sub_test123',
        'status': 'cancelled'
    }
    
    # Make request
    response = client.post(
        '/api/subscription/cancel-subscription',
        json={
            'subscription_id': 'sub_test123'
        },
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['subscription_id'] == 'sub_test123'
    assert data['status'] == 'cancelled'
    
    # Verify cancel_subscription was called with correct args
    mock_cancel_subscription.assert_called_with('sub_test123')

@patch('routes.subscription.get_subscription_prices')
@patch('routes.subscription.g')
def test_get_prices(mock_g, mock_get_prices, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock get_subscription_prices function
    mock_get_prices.return_value = [
        {
            'id': 'price_test123',
            'product_id': 'prod_test123',
            'name': 'Hatchling Monthly',
            'description': 'Monthly subscription to Hatchling',
            'amount': 999,
            'currency': 'usd',
            'interval': 'month',
            'interval_count': 1
        },
        {
            'id': 'price_test456',
            'product_id': 'prod_test123',
            'name': 'Hatchling Yearly',
            'description': 'Yearly subscription to Hatchling',
            'amount': 9999,
            'currency': 'usd',
            'interval': 'year',
            'interval_count': 1
        }
    ]
    
    # Make request
    response = client.get('/api/subscription/prices')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'prices' in data
    assert len(data['prices']) == 2
    assert data['prices'][0]['id'] == 'price_test123'
    assert data['prices'][1]['id'] == 'price_test456'
    
    # Verify get_subscription_prices was called
    mock_get_prices.assert_called_once()
