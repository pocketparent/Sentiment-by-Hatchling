import pytest
import json
import os
import tempfile
from unittest.mock import patch, MagicMock
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@patch('routes.export.db')
@patch('routes.export.g')
def test_export_entries_json(mock_g, mock_db, client):
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
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-01',
        'tags': ['test', 'memory']
    }
    mock_doc1.id = 'entry_id_1'
    
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {
        'content': 'Test entry 2',
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-02',
        'tags': ['test', 'milestone']
    }
    mock_doc2.id = 'entry_id_2'
    
    mock_query.stream.return_value = [mock_doc1, mock_doc2]
    
    # Mock tempfile and send_file
    with patch('routes.export.tempfile.NamedTemporaryFile') as mock_temp_file, \
         patch('routes.export.send_file') as mock_send_file:
        
        # Setup mock temp file
        mock_temp = MagicMock()
        mock_temp.name = '/tmp/test_export.json'
        mock_temp_file.return_value.__enter__.return_value = mock_temp
        
        # Setup mock send_file
        mock_send_file.return_value = 'file_response'
        
        # Make request
        response = client.post(
            '/api/export',
            json={
                'user_id': 'test_user_id',
                'format': 'json'
            },
            content_type='application/json'
        )
        
        # Verify send_file was called
        mock_send_file.assert_called_once()
        assert mock_send_file.call_args[0][0] == '/tmp/test_export.json'
        assert mock_send_file.call_args[1]['as_attachment'] == True
        assert 'hatchling_export_test_user_id_' in mock_send_file.call_args[1]['download_name']
        assert mock_send_file.call_args[1]['mimetype'] == 'application/json'

@patch('routes.export.db')
@patch('routes.export.g')
def test_export_entries_csv(mock_g, mock_db, client):
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
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-01',
        'tags': ['test', 'memory']
    }
    mock_doc1.id = 'entry_id_1'
    
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {
        'content': 'Test entry 2',
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-02',
        'tags': ['test', 'milestone']
    }
    mock_doc2.id = 'entry_id_2'
    
    mock_query.stream.return_value = [mock_doc1, mock_doc2]
    
    # Mock pandas and send_file
    with patch('routes.export.pd') as mock_pd, \
         patch('routes.export.tempfile.NamedTemporaryFile') as mock_temp_file, \
         patch('routes.export.send_file') as mock_send_file:
        
        # Setup mock temp file
        mock_temp = MagicMock()
        mock_temp.name = '/tmp/test_export.csv'
        mock_temp_file.return_value.__enter__.return_value = mock_temp
        
        # Setup mock DataFrame
        mock_df = MagicMock()
        mock_pd.DataFrame.return_value = mock_df
        
        # Setup mock send_file
        mock_send_file.return_value = 'file_response'
        
        # Make request
        response = client.post(
            '/api/export',
            json={
                'user_id': 'test_user_id',
                'format': 'csv'
            },
            content_type='application/json'
        )
        
        # Verify DataFrame was created and to_csv was called
        mock_pd.DataFrame.assert_called_once()
        mock_df.to_csv.assert_called_once_with('/tmp/test_export.csv', index=False)
        
        # Verify send_file was called
        mock_send_file.assert_called_once()
        assert mock_send_file.call_args[0][0] == '/tmp/test_export.csv'
        assert mock_send_file.call_args[1]['as_attachment'] == True
        assert 'hatchling_export_test_user_id_' in mock_send_file.call_args[1]['download_name']
        assert mock_send_file.call_args[1]['mimetype'] == 'text/csv'

@patch('routes.export.db')
@patch('routes.export.g')
def test_export_entries_pdf(mock_g, mock_db, client):
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
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-01',
        'tags': ['test', 'memory']
    }
    mock_doc1.id = 'entry_id_1'
    
    mock_query.stream.return_value = [mock_doc1]
    
    # Mock tempfile, pdfkit, and send_file
    with patch('routes.export.tempfile.NamedTemporaryFile') as mock_temp_file, \
         patch('routes.export.pdfkit') as mock_pdfkit, \
         patch('routes.export.send_file') as mock_send_file, \
         patch('routes.export.os.unlink') as mock_unlink:
        
        # Setup mock temp files
        mock_html_temp = MagicMock()
        mock_html_temp.name = '/tmp/test_export.html'
        
        mock_pdf_temp = MagicMock()
        mock_pdf_temp.name = '/tmp/test_export.pdf'
        
        mock_temp_file.side_effect = [
            MagicMock(__enter__=MagicMock(return_value=mock_html_temp), __exit__=MagicMock()),
            MagicMock(__enter__=MagicMock(return_value=mock_pdf_temp), __exit__=MagicMock())
        ]
        
        # Setup mock send_file
        mock_send_file.return_value = 'file_response'
        
        # Make request
        response = client.post(
            '/api/export',
            json={
                'user_id': 'test_user_id',
                'format': 'pdf'
            },
            content_type='application/json'
        )
        
        # Verify pdfkit was called
        mock_pdfkit.from_file.assert_called_once_with('/tmp/test_export.html', '/tmp/test_export.pdf')
        
        # Verify HTML file was cleaned up
        mock_unlink.assert_called_once_with('/tmp/test_export.html')
        
        # Verify send_file was called
        mock_send_file.assert_called_once()
        assert mock_send_file.call_args[0][0] == '/tmp/test_export.pdf'
        assert mock_send_file.call_args[1]['as_attachment'] == True
        assert 'hatchling_export_test_user_id_' in mock_send_file.call_args[1]['download_name']
        assert mock_send_file.call_args[1]['mimetype'] == 'application/pdf'

@patch('routes.export.db')
@patch('routes.export.g')
def test_export_entries_with_filters(mock_g, mock_db, client):
    # Mock user context
    mock_g.user = {
        'user_id': 'test_user_id',
        'role': 'user',
        'permissions': 'full'
    }
    
    # Mock Firestore query
    mock_query = MagicMock()
    mock_db.collection.return_value.where.return_value.where.return_value = mock_query
    mock_query.where.return_value = mock_query
    
    # Mock query results
    mock_doc1 = MagicMock()
    mock_doc1.to_dict.return_value = {
        'content': 'Test entry 1',
        'author_id': 'test_user_id',
        'date_of_memory': '2025-04-01',
        'tags': ['test', 'memory']
    }
    mock_doc1.id = 'entry_id_1'
    
    mock_query.stream.return_value = [mock_doc1]
    
    # Mock tempfile and send_file
    with patch('routes.export.tempfile.NamedTemporaryFile') as mock_temp_file, \
         patch('routes.export.send_file') as mock_send_file:
        
        # Setup mock temp file
        mock_temp = MagicMock()
        mock_temp.name = '/tmp/test_export.json'
        mock_temp_file.return_value.__enter__.return_value = mock_temp
        
        # Setup mock send_file
        mock_send_file.return_value = 'file_response'
        
        # Make request with filters
        response = client.post(
            '/api/export',
            json={
                'user_id': 'test_user_id',
                'format': 'json',
                'start_date': '2025-01-01',
                'end_date': '2025-12-31',
                'tags': ['memory']
            },
            content_type='application/json'
        )
        
        # Verify query was built with filters
        mock_db.collection.assert_called_with('entries')
        mock_db.collection.return_value.where.assert_called_with('author_id', '==', 'test_user_id')
        mock_db.collection.return_value.where.return_value.where.assert_called_with('deleted_flag', '==', False)
        mock_query.where.assert_called_with('date_of_memory', '>=', '2025-01-01')
        
        # Verify send_file was called
        mock_send_file.assert_called_once()
