from flask import Blueprint, request, jsonify, send_file
import logging
import traceback
from firebase_admin import firestore
import pandas as pd
import json
import csv
import os
from datetime import datetime
import tempfile
from utils.auth import authenticate, check_subscription_status, require_self_or_admin

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

export_bp = Blueprint("export", __name__)
db = firestore.client()

@export_bp.route("", methods=["POST"])
@export_bp.route("/", methods=["POST"])
@authenticate
@check_subscription_status
def export_entries():
    """
    Export entries for a user in various formats.
    
    Request body:
    - user_id: ID of the user to export entries for
    - format: Export format ('json', 'csv', 'pdf')
    - start_date: Filter by start date (optional)
    - end_date: Filter by end date (optional)
    - tags: Filter by tags (optional)
    """
    try:
        logger.info("📥 POST /api/export hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        user_id = data.get("user_id")
        export_format = data.get("format", "json").lower()
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        tags = data.get("tags", [])
        
        # Validate required fields
        if not user_id:
            return jsonify({"error": "Missing required field: user_id"}), 400
            
        # Validate format
        valid_formats = ["json", "csv", "pdf"]
        if export_format not in valid_formats:
            return jsonify({"error": f"Invalid format. Must be one of: {', '.join(valid_formats)}"}), 400
            
        # Verify user is exporting their own entries or is admin
        if not require_self_or_admin(user_id):
            return jsonify({"error": "Permission denied: cannot export entries for other users"}), 403
            
        # Build query
        query = db.collection("entries").where("author_id", "==", user_id).where("deleted_flag", "==", False)
        
        # Apply date filters if provided
        if start_date:
            query = query.where("date_of_memory", ">=", start_date)
        if end_date:
            query = query.where("date_of_memory", "<=", end_date)
            
        # Execute query
        entries = []
        for doc in query.stream():
            entry = doc.to_dict()
            entry["entry_id"] = doc.id
            
            # Filter by tags if provided
            if tags and not any(tag in entry.get("tags", []) for tag in tags):
                continue
                
            entries.append(entry)
            
        # Sort entries by date
        entries.sort(key=lambda x: x.get("date_of_memory", ""), reverse=True)
        
        # Generate export file
        if export_format == "json":
            return export_json(entries, user_id)
        elif export_format == "csv":
            return export_csv(entries, user_id)
        elif export_format == "pdf":
            return export_pdf(entries, user_id)
            
    except Exception as e:
        logger.error(f"❌ Error in POST /api/export: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Export failed", "details": str(e)}), 500

def export_json(entries, user_id):
    """Export entries as JSON file."""
    try:
        # Create a temporary file
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as temp_file:
            temp_path = temp_file.name
            
            # Clean entries for export (remove internal fields)
            clean_entries = []
            for entry in entries:
                clean_entry = {
                    "entry_id": entry.get("entry_id"),
                    "content": entry.get("content"),
                    "date_of_memory": entry.get("date_of_memory"),
                    "tags": entry.get("tags", []),
                    "media_url": entry.get("media_url"),
                    "privacy": entry.get("privacy"),
                    "source_type": entry.get("source_type"),
                    "transcription": entry.get("transcription")
                }
                clean_entries.append(clean_entry)
                
            # Write JSON to file
            json.dump({"entries": clean_entries}, temp_file, indent=2)
            
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"hatchling_export_{user_id}_{timestamp}.json"
        
        # Send file
        return send_file(
            temp_path,
            as_attachment=True,
            download_name=filename,
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(f"❌ Error exporting JSON: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def export_csv(entries, user_id):
    """Export entries as CSV file."""
    try:
        # Create a temporary file
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as temp_file:
            temp_path = temp_file.name
            
            # Prepare data for CSV
            csv_data = []
            for entry in entries:
                csv_entry = {
                    "Entry ID": entry.get("entry_id"),
                    "Date": entry.get("date_of_memory"),
                    "Content": entry.get("content", ""),
                    "Tags": ", ".join(entry.get("tags", [])),
                    "Media URL": entry.get("media_url", ""),
                    "Privacy": entry.get("privacy", ""),
                    "Source": entry.get("source_type", ""),
                    "Transcription": entry.get("transcription", "")
                }
                csv_data.append(csv_entry)
                
            # Convert to DataFrame and write to CSV
            if csv_data:
                df = pd.DataFrame(csv_data)
                df.to_csv(temp_path, index=False)
            else:
                # Create empty CSV with headers
                with open(temp_path, 'w', newline='') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow(["Entry ID", "Date", "Content", "Tags", "Media URL", "Privacy", "Source", "Transcription"])
            
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"hatchling_export_{user_id}_{timestamp}.csv"
        
        # Send file
        return send_file(
            temp_path,
            as_attachment=True,
            download_name=filename,
            mimetype="text/csv"
        )
        
    except Exception as e:
        logger.error(f"❌ Error exporting CSV: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def export_pdf(entries, user_id):
    """Export entries as PDF file."""
    try:
        # Create a temporary file for HTML content
        with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as html_file:
            html_path = html_file.name
            
            # Generate HTML content
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Hatchling Journal Export</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    h1 {{ color: #e6a4b4; }}
                    .entry {{ 
                        margin-bottom: 30px; 
                        padding: 15px; 
                        border: 1px solid #e6d7d7; 
                        border-radius: 10px;
                        background-color: #fdf6f6;
                    }}
                    .date {{ 
                        font-weight: bold; 
                        color: #8c6f6f;
                        margin-bottom: 10px;
                    }}
                    .content {{ 
                        white-space: pre-wrap; 
                        margin-bottom: 10px;
                    }}
                    .tags {{ 
                        margin-top: 10px;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 5px;
                    }}
                    .tag {{ 
                        background-color: #e6a4b4; 
                        color: white; 
                        padding: 3px 8px; 
                        border-radius: 10px; 
                        font-size: 12px;
                    }}
                    .media {{ 
                        margin-top: 15px; 
                        max-width: 100%;
                    }}
                    .media img {{ 
                        max-width: 100%; 
                        max-height: 300px; 
                        border-radius: 5px;
                    }}
                    .footer {{ 
                        margin-top: 50px; 
                        text-align: center; 
                        font-size: 12px; 
                        color: #8c6f6f;
                    }}
                </style>
            </head>
            <body>
                <h1>Hatchling Journal Export</h1>
                <p>Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
            """
            
            # Add entries
            for entry in entries:
                date = entry.get("date_of_memory", "Unknown date")
                content = entry.get("content", "")
                tags = entry.get("tags", [])
                media_url = entry.get("media_url", "")
                
                html_content += f"""
                <div class="entry">
                    <div class="date">{date}</div>
                    <div class="content">{content}</div>
                """
                
                # Add media if available
                if media_url:
                    if any(media_url.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif']):
                        html_content += f"""
                        <div class="media">
                            <img src="{media_url}" alt="Memory media">
                        </div>
                        """
                    else:
                        html_content += f"""
                        <div class="media">
                            <a href="{media_url}" target="_blank">View media</a>
                        </div>
                        """
                
                # Add tags if available
                if tags:
                    html_content += '<div class="tags">'
                    for tag in tags:
                        html_content += f'<span class="tag">#{tag}</span>'
                    html_content += '</div>'
                
                html_content += '</div>'
            
            # Add footer
            html_content += """
                <div class="footer">
                    <p>Exported from Hatchling - Your Baby Memory Journal</p>
                </div>
            </body>
            </html>
            """
            
            # Write HTML to file
            html_file.write(html_content.encode('utf-8'))
            
        # Create a temporary file for PDF
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as pdf_file:
            pdf_path = pdf_file.name
            
        # Convert HTML to PDF using wkhtmltopdf
        try:
            import pdfkit
            pdfkit.from_file(html_path, pdf_path)
        except Exception as e:
            logger.error(f"❌ Error converting HTML to PDF with pdfkit: {str(e)}")
            
            # Fallback to weasyprint if pdfkit fails
            try:
                from weasyprint import HTML
                HTML(html_path).write_pdf(pdf_path)
            except Exception as e2:
                logger.error(f"❌ Error converting HTML to PDF with weasyprint: {str(e2)}")
                
                # If both PDF methods fail, return HTML instead
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"hatchling_export_{user_id}_{timestamp}.html"
                
                return send_file(
                    html_path,
                    as_attachment=True,
                    download_name=filename,
                    mimetype="text/html"
                )
            
        # Clean up HTML file
        try:
            os.unlink(html_path)
        except:
            pass
            
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"hatchling_export_{user_id}_{timestamp}.pdf"
        
        # Send file
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=filename,
            mimetype="application/pdf"
        )
        
    except Exception as e:
        logger.error(f"❌ Error exporting PDF: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def require_self_or_admin(user_id):
    """Check if current user is accessing their own data or is admin."""
    from flask import g
    
    # Check if user has admin role
    if g.user.get('role') == 'admin':
        return True
        
    # Check if user is accessing their own data
    if g.user.get('user_id') == user_id:
        return True
        
    return False
