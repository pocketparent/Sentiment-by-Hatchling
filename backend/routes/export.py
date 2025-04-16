from flask import Blueprint, request, jsonify, send_file
from firebase_admin import firestore
import logging
import csv
import json
import tempfile
import os
from datetime import datetime
from utils.auth_middleware import require_role
import io

# Configure logging
logger = logging.getLogger(__name__)

export_bp = Blueprint('export', __name__)

@export_bp.route('', methods=['GET'])
@export_bp.route('/', methods=['GET'])
@require_role(['parent', 'co-parent', 'admin'])
def export_entries():
    """
    Export journal entries in CSV or JSON format.
    
    Query parameters:
    - format: 'csv' or 'json' (default: 'csv')
    - start_date: Filter entries from this date (YYYY-MM-DD)
    - end_date: Filter entries until this date (YYYY-MM-DD)
    - author_id: Filter by specific author
    - privacy: Filter by privacy level
    """
    try:
        # Get query parameters
        export_format = request.args.get('format', 'csv').lower()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        author_id = request.args.get('author_id')
        privacy = request.args.get('privacy')
        
        # Validate format
        if export_format not in ['csv', 'json']:
            return jsonify({"error": "Invalid format. Use 'csv' or 'json'"}), 400
            
        # Get user ID from header
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Get entries from Firestore
        db = firestore.client()
        query = db.collection('entries').where('deleted_flag', '==', False)
        
        # Apply filters
        if author_id:
            query = query.where('author_id', '==', author_id)
        elif privacy != 'public':
            # If not filtering by author and not requesting public entries,
            # limit to entries the user has permission to see
            query = query.where('author_id', '==', user_id)
            
        # Apply date filters (need to be applied after fetching)
        entries = list(query.stream())
        filtered_entries = []
        
        for doc in entries:
            entry = doc.to_dict()
            entry['entry_id'] = doc.id
            
            # Apply date filters if provided
            if start_date or end_date:
                entry_date = entry.get('date_of_memory')
                if not entry_date:
                    continue
                    
                if start_date and entry_date < start_date:
                    continue
                    
                if end_date and entry_date > end_date:
                    continue
                    
            # Apply privacy filter
            if privacy and entry.get('privacy') != privacy:
                continue
                
            # Check permissions based on privacy
            entry_privacy = entry.get('privacy', 'private')
            entry_author = entry.get('author_id')
            
            # Skip entries user doesn't have permission to see
            if entry_privacy == 'private' and entry_author != user_id:
                continue
                
            filtered_entries.append(entry)
            
        # Sort entries by date
        filtered_entries.sort(key=lambda x: x.get('date_of_memory', ''), reverse=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"hatchling_export_{timestamp}"
        
        # Export based on format
        if export_format == 'csv':
            return export_as_csv(filtered_entries, filename)
        else:
            return export_as_json(filtered_entries, filename)
            
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        return jsonify({"error": "Export failed", "details": str(e)}), 500

def export_as_csv(entries, filename):
    """Export entries as CSV file"""
    try:
        # Create a temporary file
        csv_file = io.StringIO()
        
        # Define CSV fields
        fieldnames = ['entry_id', 'date_of_memory', 'content', 'author_id', 
                     'privacy', 'tags', 'media_url', 'transcription', 
                     'source_type', 'timestamp_created']
                     
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        
        # Write entries
        for entry in entries:
            # Convert tags list to string
            if 'tags' in entry and isinstance(entry['tags'], list):
                entry['tags'] = ', '.join(entry['tags'])
                
            # Convert timestamps to strings
            if 'timestamp_created' in entry and hasattr(entry['timestamp_created'], 'timestamp'):
                entry['timestamp_created'] = datetime.fromtimestamp(
                    entry['timestamp_created'].timestamp()
                ).isoformat()
                
            # Write only the fields we want
            row = {field: entry.get(field, '') for field in fieldnames}
            writer.writerow(row)
            
        # Prepare the response
        csv_file.seek(0)
        return send_file(
            io.BytesIO(csv_file.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f"{filename}.csv"
        )
        
    except Exception as e:
        logger.error(f"CSV export error: {str(e)}")
        raise

def export_as_json(entries, filename):
    """Export entries as JSON file"""
    try:
        # Process entries for JSON serialization
        processed_entries = []
        
        for entry in entries:
            # Convert timestamps to strings
            if 'timestamp_created' in entry and hasattr(entry['timestamp_created'], 'timestamp'):
                entry['timestamp_created'] = datetime.fromtimestamp(
                    entry['timestamp_created'].timestamp()
                ).isoformat()
                
            processed_entries.append(entry)
            
        # Create JSON string
        json_data = json.dumps({"entries": processed_entries}, indent=2)
        
        # Prepare the response
        return send_file(
            io.BytesIO(json_data.encode()),
            mimetype='application/json',
            as_attachment=True,
            download_name=f"{filename}.json"
        )
        
    except Exception as e:
        logger.error(f"JSON export error: {str(e)}")
        raise

@export_bp.route('/pdf', methods=['GET'])
@require_role(['parent', 'co-parent', 'admin'])
def export_as_pdf():
    """
    Export journal entries as a formatted PDF.
    
    Query parameters:
    - start_date: Filter entries from this date (YYYY-MM-DD)
    - end_date: Filter entries until this date (YYYY-MM-DD)
    - author_id: Filter by specific author
    - privacy: Filter by privacy level
    """
    # This is a placeholder for PDF export functionality
    # Would require a PDF generation library like ReportLab or WeasyPrint
    return jsonify({
        "status": "not_implemented", 
        "message": "PDF export will be implemented in a future update"
    }), 501

