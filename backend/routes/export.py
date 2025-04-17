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
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import requests
from PIL import Image as PILImage

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
    - entry_id: Export a single entry
    - entry_ids: Export multiple entries (comma-separated)
    """
    try:
        # Get query parameters
        export_format = request.args.get('format', 'csv').lower()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        author_id = request.args.get('author_id')
        privacy = request.args.get('privacy')
        entry_id = request.args.get('entry_id')
        entry_ids = request.args.get('entry_ids')
        
        # Validate format
        if export_format not in ['csv', 'json']:
            return jsonify({"error": "Invalid format. Use 'csv' or 'json'"}), 400
            
        # Get user ID from header
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Get entries from Firestore
        db = firestore.client()
        
        # Handle specific entry_id or entry_ids
        if entry_id:
            # Get a single entry
            doc = db.collection('entries').document(entry_id).get()
            if not doc.exists:
                return jsonify({"error": f"Entry {entry_id} not found"}), 404
                
            entries = [doc]
        elif entry_ids:
            # Get multiple specific entries
            ids_list = entry_ids.split(',')
            entries = []
            for id in ids_list:
                doc = db.collection('entries').document(id.strip()).get()
                if doc.exists:
                    entries.append(doc)
        else:
            # Query based on filters
            query = db.collection('entries').where('deleted_flag', '==', False)
            
            # Apply filters
            if author_id:
                query = query.where('author_id', '==', author_id)
            elif privacy != 'public':
                # If not filtering by author and not requesting public entries,
                # limit to entries the user has permission to see
                query = query.where('author_id', '==', user_id)
                
            entries = list(query.stream())
        
        # Process and filter entries
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
    - entry_id: Export a single entry
    - entry_ids: Export multiple entries (comma-separated)
    """
    try:
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        author_id = request.args.get('author_id')
        privacy = request.args.get('privacy')
        entry_id = request.args.get('entry_id')
        entry_ids = request.args.get('entry_ids')
        
        # Get user ID from header
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Get entries from Firestore
        db = firestore.client()
        
        # Handle specific entry_id or entry_ids
        if entry_id:
            # Get a single entry
            doc = db.collection('entries').document(entry_id).get()
            if not doc.exists:
                return jsonify({"error": f"Entry {entry_id} not found"}), 404
                
            entries = [doc]
        elif entry_ids:
            # Get multiple specific entries
            ids_list = entry_ids.split(',')
            entries = []
            for id in ids_list:
                doc = db.collection('entries').document(id.strip()).get()
                if doc.exists:
                    entries.append(doc)
        else:
            # Query based on filters
            query = db.collection('entries').where('deleted_flag', '==', False)
            
            # Apply filters
            if author_id:
                query = query.where('author_id', '==', author_id)
            elif privacy != 'public':
                # If not filtering by author and not requesting public entries,
                # limit to entries the user has permission to see
                query = query.where('author_id', '==', user_id)
                
            entries = list(query.stream())
        
        # Process and filter entries
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
        
        # Generate PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        
        # Create custom styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.brown,
            spaceAfter=12
        )
        
        date_style = ParagraphStyle(
            'DateStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            spaceAfter=6
        )
        
        content_style = ParagraphStyle(
            'ContentStyle',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=12
        )
        
        tag_style = ParagraphStyle(
            'TagStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.darkgray,
            spaceAfter=20
        )
        
        # Build PDF content
        elements = []
        
        # Add title
        elements.append(Paragraph("Hatchling Memories", title_style))
        elements.append(Paragraph(f"Exported on {datetime.now().strftime('%B %d, %Y')}", date_style))
        elements.append(Spacer(1, 0.25*inch))
        
        # Add entries
        for entry in filtered_entries:
            # Add date
            date_str = entry.get('date_of_memory', 'Unknown date')
            try:
                # Try to format the date if it's in YYYY-MM-DD format
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%B %d, %Y')
            except:
                formatted_date = date_str
                
            elements.append(Paragraph(f"<b>{formatted_date}</b>", date_style))
            
            # Add content
            content = entry.get('content', '')
            if content:
                elements.append(Paragraph(content, content_style))
            
            # Add media if available
            media_url = entry.get('media_url')
            if media_url:
                try:
                    # Create a temporary file for the image
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp:
                        # Download the image
                        response = requests.get(media_url, stream=True)
                        if response.status_code == 200:
                            # Save the image to the temporary file
                            for chunk in response.iter_content(1024):
                                temp.write(chunk)
                            
                            # Close the file
                            temp.close()
                            
                            # Resize the image if needed
                            img = PILImage.open(temp.name)
                            width, height = img.size
                            max_width = 5 * inch
                            if width > max_width:
                                ratio = max_width / width
                                new_height = height * ratio
                                img = img.resize((int(max_width), int(new_height)), PILImage.LANCZOS)
                                img.save(temp.name)
                            
                            # Add the image to the PDF
                            elements.append(Image(temp.name, width=min(width, max_width), height=None))
                            elements.append(Spacer(1, 0.1*inch))
                            
                            # Clean up the temporary file
                            os.unlink(temp.name)
                except Exception as e:
                    logger.error(f"Error adding image to PDF: {str(e)}")
                    elements.append(Paragraph(f"[Image could not be displayed: {media_url}]", content_style))
            
            # Add tags
            tags = entry.get('tags', [])
            if tags:
                if isinstance(tags, list):
                    tags_str = ", ".join(tags)
                else:
                    tags_str = tags
                elements.append(Paragraph(f"Tags: {tags_str}", tag_style))
            
            elements.append(Spacer(1, 0.2*inch))
        
        # Build the PDF
        doc.build(elements)
        
        # Prepare the response
        buffer.seek(0)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"hatchling_memories_{timestamp}.pdf"
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"PDF export error: {str(e)}")
        return jsonify({"error": "PDF export failed", "details": str(e)}), 500
