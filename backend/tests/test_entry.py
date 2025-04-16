import pytest
import json
from unittest.mock import patch, MagicMock
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@patch('routes.entry.db')
@patch('routes.entry.g')
def test_get_entries(mock_g, mock_db, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock Firestore query
    mock_query = MagicMock()
    mock_db.collection.return_value.where.return_value.where.return_value = mock_query
    
    # Mock query results
    mock_doc1 = MagicMock()
    mock_doc1.to_dict.return_value = {
        'content': 'Test entry 1',
        'date_of_memory': '2025-04-01',
        'tags': ['test', 'memory']
    }
    mock_doc1.id = 'entry_id_1'
    
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {
        'content': 'Test entry 2',
        'date_of_memory': '2025-04-02',
        'tags': ['test', 'milestone']
    }
    mock_doc2.id = 'entry_id_2'
    
    mock_query.stream.return_value = [mock_doc1, mock_doc2]
    
    # Make request
    response = client.get('/api/entry?user_id=test_user_id')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'entries' in data
    assert len(data['entries']) == 2
    assert data['entries'][0]['entry_id'] == 'entry_id_1'
    assert data['entries'][1]['entry_id'] == 'entry_id_2'

@patch('routes.entry.db')
@patch('routes.entry.g')
def test_get_entry(mock_g, mock_db, client):
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
        'content': 'Test entry content',
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-01',
        'tags': ['test', 'memory'],
        'deleted_flag': False
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
    
    # Make request
    response = client.get('/api/entry/test_entry_id')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['content'] == 'Test entry content'
    assert data['entry_id'] == 'test_entry_id'

@patch('routes.entry.db')
@patch('routes.entry.g')
@patch('routes.entry.uuid.uuid4')
def test_create_entry(mock_uuid, mock_g, mock_db, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock UUID
    mock_uuid.return_value = 'new_entry_id'
    
    # Mock Firestore document reference
    mock_doc_ref = MagicMock()
    mock_db.collection.return_value.document.return_value = mock_doc_ref
    
    # Make request
    response = client.post(
        '/api/entry',
        data={
            'content': 'New test entry',
            'author_id': 'test_user_id',
            'date_of_memory': '2025-04-16',
            'privacy': 'private'
        }
    )
    
    # Check response
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['status'] == 'created'
    assert data['entry']['content'] == 'New test entry'
    assert data['entry']['entry_id'] == 'new_entry_id'
    
    # Verify Firestore was called
    mock_db.collection.assert_called_with('entries')
    mock_db.collection.return_value.document.assert_called_with('new_entry_id')
    mock_doc_ref.set.assert_called_once()

@patch('routes.entry.db')
@patch('routes.entry.g')
def test_update_entry(mock_g, mock_db, client):
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
        'content': 'Original content',
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-01',
        'deleted_flag': False
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
    
    # Mock updated document
    mock_updated_doc = MagicMock()
    mock_updated_doc.to_dict.return_value = {
        'content': 'Updated content',
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-01',
        'deleted_flag': False
    }
    mock_db.collection.return_value.document.return_value.get.side_effect = [mock_doc, mock_updated_doc]
    
    # Make request
    response = client.patch(
        '/api/entry/test_entry_id',
        data={
            'content': 'Updated content'
        }
    )
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'updated'
    assert data['entry']['content'] == 'Updated content'

@patch('routes.entry.db')
@patch('routes.entry.g')
def test_delete_entry(mock_g, mock_db, client):
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
        'content': 'Test entry content',
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-01',
        'deleted_flag': False
    }
    mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
    
    # Make request
    response = client.delete('/api/entry/test_entry_id')
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'deleted'
    assert data['entry_id'] == 'test_entry_id'
    
    # Verify Firestore update was called with deleted_flag=True
    mock_db.collection.return_value.document.return_value.update.assert_called_with({"deleted_flag": True})
