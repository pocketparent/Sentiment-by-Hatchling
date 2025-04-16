import pytest
import json
from unittest.mock import patch, MagicMock
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@patch('routes.admin.db')
@patch('routes.admin.g')
def test_get_users(mock_g, mock_db, client):
    # Mock user context with admin role
    mock_g.user = {
        'user_id': 'admin_user_id',
        'role': 'admin',
        'permissions': 'full'
    }
    
    # Mock Firestore query
    mock_query = MagicMock()
    mock_db.collection.return_value = mock_query
    mock_query.where.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.offset.return_value = mock_query
    
    # Mock query results
    mock_doc1 = MagicMock()
    mock_doc1.to_dict.return_value = {
        'email': 'user1@example.com',
        'name': 'User One',
        'subscription_status': 'active'
    }
    mock_doc1.id = 'user_id_1'
    
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {
        'email': 'user2@example.com',
        'name': 'User Two',
        'subscription_status': 'trialing'
    }
    mock_doc2.id = 'user_id_2'
    
    # Mock stream method to return docs for both total count and results
    mock_query.stream.return_value = [mock_doc1, mock_doc2]
    
    # Make request
    response = client.get('/api/admin/users?limit=10&offset=0')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'users' in data
    assert len(data['users']) == 2
    assert data['total'] == 2
    assert data['limit'] == 10
    assert data['offset'] == 0
    assert data['users'][0]['user_id'] == 'user_id_1'
    assert data['users'][1]['user_id'] == 'user_id_2'

@patch('routes.admin.db')
@patch('routes.admin.g')
def test_get_user(mock_g, mock_db, client):
    # Mock user context with admin role
    mock_g.user = {
        'user_id': 'admin_user_id',
        'role': 'admin',
        'permissions': 'full'
    }
    
    # Mock Firestore document
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        'email': 'user1@example.com',
        'name': 'User One',
        'subscription_status': 'active',
        'phone_number': '+1234567890'
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
    
    # Mock entries query
    mock_entries_query = MagicMock()
    mock_db.collection.return_value.where.return_value.where.return_value = mock_entries_query
    mock_entries_query.stream.return_value = [MagicMock(), MagicMock()]  # 2 entries
    
    # Make request
    response = client.get('/api/admin/users/user_id_1')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['user_id'] == 'user_id_1'
    assert data['email'] == 'user1@example.com'
    assert data['entries_count'] == 2

@patch('routes.admin.db')
@patch('routes.admin.g')
def test_update_user(mock_g, mock_db, client):
    # Mock user context with admin role
    mock_g.user = {
        'user_id': 'admin_user_id',
        'role': 'admin',
        'permissions': 'full'
    }
    
    # Mock Firestore document
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        'email': 'user1@example.com',
        'name': 'User One',
        'subscription_status': 'active'
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
    
    # Mock updated document
    mock_updated_doc = MagicMock()
    mock_updated_doc.to_dict.return_value = {
        'email': 'user1@example.com',
        'name': 'Updated Name',
        'subscription_status': 'active'
    }
    mock_db.collection.return_value.document.return_value.get.side_effect = [mock_doc, mock_updated_doc]
    
    # Make request
    response = client.patch(
        '/api/admin/users/user_id_1',
        json={
            'name': 'Updated Name'
        },
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['message'] == 'User updated successfully'
    assert data['user']['name'] == 'Updated Name'
    
    # Verify Firestore update was called
    mock_db.collection.return_value.document.return_value.update.assert_called_with({'name': 'Updated Name'})

@patch('routes.admin.db')
@patch('routes.admin.g')
def test_get_entries(mock_g, mock_db, client):
    # Mock user context with admin role
    mock_g.user = {
        'user_id': 'admin_user_id',
        'role': 'admin',
        'permissions': 'full'
    }
    
    # Mock Firestore query
    mock_query = MagicMock()
    mock_db.collection.return_value.where.return_value.where.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.offset.return_value = mock_query
    
    # Mock query results
    mock_doc1 = MagicMock()
    mock_doc1.to_dict.return_value = {
        'content': 'Test entry 1',
        'author_id': 'user_id_1',
        'date_of_memory': '2025-04-01'
    }
    mock_doc1.id = 'entry_id_1'
    
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {
        'content': 'Test entry 2',
        'author_id': 'user_id_1',
        'date_of_memory': '2025-04-02'
    }
    mock_doc2.id = 'entry_id_2'
    
    # Mock stream method to return docs for both total count and results
    mock_query.stream.return_value = [mock_doc1, mock_doc2]
    
    # Make request
    response = client.get('/api/admin/entries?user_id=user_id_1&limit=10&offset=0')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'entries' in data
    assert len(data['entries']) == 2
    assert data['total'] == 2
    assert data['entries'][0]['entry_id'] == 'entry_id_1'
    assert data['entries'][1]['entry_id'] == 'entry_id_2'

@patch('routes.admin.db')
@patch('routes.admin.g')
def test_get_stats(mock_g, mock_db, client):
    # Mock user context with admin role
    mock_g.user = {
        'user_id': 'admin_user_id',
        'role': 'admin',
        'permissions': 'full'
    }
    
    # Mock Firestore queries
    mock_users_query = MagicMock()
    mock_db.collection.return_value = mock_users_query
    mock_users_query.stream.return_value = [MagicMock(), MagicMock(), MagicMock()]  # 3 users
    
    # Mock status queries
    mock_status_query = MagicMock()
    mock_db.collection.return_value.where.return_value = mock_status_query
    mock_status_query.stream.return_value = [MagicMock()]  # 1 user per status
    
    # Mock entries queries
    mock_entries_query = MagicMock()
    mock_db.collection.return_value.where.return_value.where.return_value = mock_entries_query
    mock_entries_query.stream.return_value = [MagicMock(), MagicMock(), MagicMock(), MagicMock(), MagicMock()]  # 5 entries
    
    # Mock source queries
    mock_source_query = MagicMock()
    mock_db.collection.return_value.where.return_value.where.return_value.where.return_value = mock_source_query
    mock_source_query.stream.return_value = [MagicMock(), MagicMock()]  # 2 entries per source
    
    # Make request
    response = client.get('/api/admin/stats')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'users' in data
    assert 'entries' in data
    assert data['users']['total'] == 3
    assert data['entries']['total'] == 5

@patch('routes.admin.db')
@patch('routes.admin.g')
def test_get_settings(mock_g, mock_db, client):
    # Mock user context with admin role
    mock_g.user = {
        'user_id': 'admin_user_id',
        'role': 'admin',
        'permissions': 'full'
    }
    
    # Mock Firestore document
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        'trial_days': 14,
        'default_privacy': 'private',
        'enable_ai_features': True,
        'system_email': 'support@myhatchling.ai'
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
    
    # Make request
    response = client.get('/api/admin/settings')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['trial_days'] == 14
    assert data['default_privacy'] == 'private'
    assert data['enable_ai_features'] == True
