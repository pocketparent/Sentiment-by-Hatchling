import pytest
import json
from unittest.mock import patch, MagicMock
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@patch('routes.nudge.db')
@patch('routes.nudge.g')
def test_create_nudge(mock_g, mock_db, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock UUID
    with patch('routes.nudge.uuid.uuid4', return_value='new_nudge_id'):
        # Make request
        response = client.post(
            '/api/nudge',
            json={
                'user_id': 'test_user_id',
                'message': 'Time to journal!',
                'schedule_time': '2025-04-16T20:00:00',
                'repeat': 'daily',
                'active': True
            },
            content_type='application/json'
        )
        
        # Check response
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['status'] == 'created'
        assert data['nudge']['nudge_id'] == 'new_nudge_id'
        assert data['nudge']['message'] == 'Time to journal!'
        assert data['nudge']['repeat'] == 'daily'
        
        # Verify Firestore was called
        mock_db.collection.assert_called_with('nudges')
        mock_db.collection.return_value.document.assert_called_with('new_nudge_id')
        mock_db.collection.return_value.document.return_value.set.assert_called_once()

@patch('routes.nudge.db')
@patch('routes.nudge.g')
def test_get_nudges(mock_g, mock_db, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock Firestore query
    mock_query = MagicMock()
    mock_db.collection.return_value.where.return_value = mock_query
    
    # Mock query results
    mock_doc1 = MagicMock()
    mock_doc1.to_dict.return_value = {
        'user_id': 'test_user_id',
        'message': 'Nudge 1',
        'schedule_time': '2025-04-16T20:00:00',
        'repeat': 'daily',
        'active': True
    }
    mock_doc1.id = 'nudge_id_1'
    
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {
        'user_id': 'test_user_id',
        'message': 'Nudge 2',
        'schedule_time': '2025-04-17T20:00:00',
        'repeat': 'weekly',
        'active': False
    }
    mock_doc2.id = 'nudge_id_2'
    
    mock_query.stream.return_value = [mock_doc1, mock_doc2]
    
    # Make request
    response = client.get('/api/nudge?user_id=test_user_id')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'nudges' in data
    assert len(data['nudges']) == 2
    assert data['nudges'][0]['nudge_id'] == 'nudge_id_1'
    assert data['nudges'][1]['nudge_id'] == 'nudge_id_2'

@patch('routes.nudge.db')
@patch('routes.nudge.g')
def test_get_nudge(mock_g, mock_db, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock Firestore document
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        'user_id': 'test_user_id',
        'message': 'Test nudge',
        'schedule_time': '2025-04-16T20:00:00',
        'repeat': 'daily',
        'active': True
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
    
    # Make request
    response = client.get('/api/nudge/test_nudge_id')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['nudge_id'] == 'test_nudge_id'
    assert data['message'] == 'Test nudge'
    assert data['repeat'] == 'daily'

@patch('routes.nudge.db')
@patch('routes.nudge.g')
def test_update_nudge(mock_g, mock_db, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock Firestore document
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        'user_id': 'test_user_id',
        'message': 'Original message',
        'schedule_time': '2025-04-16T20:00:00',
        'repeat': 'daily',
        'active': True
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
    
    # Mock updated document
    mock_updated_doc = MagicMock()
    mock_updated_doc.to_dict.return_value = {
        'user_id': 'test_user_id',
        'message': 'Updated message',
        'schedule_time': '2025-04-16T20:00:00',
        'repeat': 'weekly',
        'active': True
    }
    mock_db.collection.return_value.document.return_value.get.side_effect = [mock_doc, mock_updated_doc]
    
    # Make request
    response = client.patch(
        '/api/nudge/test_nudge_id',
        json={
            'message': 'Updated message',
            'repeat': 'weekly'
        },
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'updated'
    assert data['nudge']['message'] == 'Updated message'
    assert data['nudge']['repeat'] == 'weekly'
    
    # Verify Firestore update was called
    mock_db.collection.return_value.document.return_value.update.assert_called_with({
        'message': 'Updated message',
        'repeat': 'weekly'
    })

@patch('routes.nudge.db')
@patch('routes.nudge.g')
def test_delete_nudge(mock_g, mock_db, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock Firestore document
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        'user_id': 'test_user_id',
        'message': 'Test nudge',
        'schedule_time': '2025-04-16T20:00:00',
        'repeat': 'daily',
        'active': True
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
    
    # Make request
    response = client.delete('/api/nudge/test_nudge_id')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'deleted'
    assert data['nudge_id'] == 'test_nudge_id'
    
    # Verify Firestore delete was called
    mock_db.collection.return_value.document.return_value.delete.assert_called_once()

@patch('routes.nudge.db')
@patch('routes.nudge.g')
@patch('routes.nudge.send_sms')
def test_process_nudges(mock_send_sms, mock_g, mock_db, client):
    # Mock user context with admin role
    mock_g.user = {
        'user_id': 'admin_user_id',
        'role': 'admin',
        'permissions': 'full'
    }
    
    # Mock Firestore query for due nudges
    mock_query = MagicMock()
    mock_db.collection.return_value.where.return_value.where.return_value = mock_query
    
    # Mock nudge document
    mock_nudge_doc = MagicMock()
    mock_nudge_doc.to_dict.return_value = {
        'user_id': 'test_user_id',
        'message': 'Time to journal!',
        'schedule_time': '2025-04-16T20:00:00',
        'repeat': 'daily',
        'active': True,
        'next_send': '2025-04-16T20:00:00'
    }
    mock_nudge_doc.id = 'nudge_id_1'
    
    # Mock user document
    mock_user_doc = MagicMock()
    mock_user_doc.exists = True
    mock_user_doc.to_dict.return_value = {
        'name': 'Test User',
        'phone_number': '+1234567890'
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_user_doc
    
    # Mock query results
    mock_query.stream.return_value = [mock_nudge_doc]
    
    # Mock SMS sending
    mock_send_sms.return_value = {'success': True, 'sid': 'test_sid'}
    
    # Make request
    response = client.post(
        '/api/nudge/process',
        json={'dry_run': False},
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'completed'
    assert data['processed_count'] == 1
    assert data['sent_count'] == 1
    
    # Verify SMS was sent
    mock_send_sms.assert_called_with('+1234567890', 'Time to journal!')
