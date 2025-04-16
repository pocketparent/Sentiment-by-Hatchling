from flask import Blueprint, request, jsonify
import logging
import os
from datetime import datetime, timedelta
from utils import firebase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
nudge_bp = Blueprint('nudge', __name__)

@nudge_bp.route('/settings', methods=['GET', 'POST'])
def nudge_settings():
    """
    GET: Retrieve user's nudge settings
    POST: Update user's nudge settings
    """
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    db = firebase.db
    user_ref = db.collection('users').document(user_id)
    
    if request.method == 'GET':
        # Get current nudge settings
        user_doc = user_ref.get()
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        user_data = user_doc.to_dict()
        nudge_settings = {
            'nudge_opt_in': user_data.get('nudge_opt_in', False),
            'nudge_frequency': user_data.get('nudge_frequency', 'weekly')
        }
        
        return jsonify(nudge_settings), 200
    
    elif request.method == 'POST':
        # Update nudge settings
        data = request.json
        
        if data is None:
            return jsonify({"error": "Invalid request data"}), 400
        
        nudge_opt_in = data.get('nudge_opt_in')
        nudge_frequency = data.get('nudge_frequency')
        
        # Validate frequency
        valid_frequencies = ['daily', 'weekly', 'occasionally']
        if nudge_frequency and nudge_frequency not in valid_frequencies:
            return jsonify({"error": f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}"}), 400
        
        # Update only provided fields
        update_data = {}
        if nudge_opt_in is not None:
            update_data['nudge_opt_in'] = nudge_opt_in
        if nudge_frequency:
            update_data['nudge_frequency'] = nudge_frequency
        
        if update_data:
            user_ref.update(update_data)
            logger.info(f"Updated nudge settings for user {user_id}: {update_data}")
            return jsonify({"status": "success", "message": "Nudge settings updated"}), 200
        else:
            return jsonify({"error": "No valid settings provided"}), 400

@nudge_bp.route('/send', methods=['POST'])
def send_nudge():
    """
    Send a nudge to users based on inactivity or other triggers.
    This endpoint can be called by a scheduled job.
    """
    # Admin authentication check
    api_key = request.headers.get('X-API-Key')
    if not api_key or api_key != os.environ.get('ADMIN_API_KEY'):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        db = firebase.db
        
        # Get nudge type from request
        data = request.json
        if not data:
            return jsonify({"error": "Invalid request data"}), 400
        
        nudge_type = data.get('type', 'inactivity')
        
        if nudge_type == 'inactivity':
            # Find users who haven't created entries in a while but have opted in for nudges
            threshold_days = {
                'daily': 2,
                'weekly': 7,
                'occasionally': 14
            }
            
            # Get users who have opted in for nudges
            users_ref = db.collection('users')
            opted_in_users = users_ref.where('nudge_opt_in', '==', True).stream()
            
            nudges_sent = 0
            for user in opted_in_users:
                user_data = user.to_dict()
                user_id = user.id
                frequency = user_data.get('nudge_frequency', 'weekly')
                days_threshold = threshold_days.get(frequency, 7)
                
                # Calculate the date threshold based on frequency
                threshold_date = datetime.now() - timedelta(days=days_threshold)
                
                # Check user's last activity
                entries_ref = db.collection('entries')
                recent_entries = entries_ref.where('author_id', '==', user_id).order_by('timestamp_created', direction='DESCENDING').limit(1).stream()
                
                recent_entry_list = list(recent_entries)
                if not recent_entry_list:
                    # No entries yet, send a welcome nudge
                    send_nudge_to_user(user_id, 'welcome')
                    nudges_sent += 1
                else:
                    last_entry = recent_entry_list[0].to_dict()
                    last_entry_time = last_entry.get('timestamp_created')
                    
                    # Convert Firestore timestamp to datetime if needed
                    if hasattr(last_entry_time, 'timestamp'):
                        last_entry_time = datetime.fromtimestamp(last_entry_time.timestamp())
                    
                    if last_entry_time < threshold_date:
                        # User is inactive, send a nudge
                        send_nudge_to_user(user_id, 'inactivity')
                        nudges_sent += 1
            
            return jsonify({
                "status": "success", 
                "message": f"Processed inactivity nudges", 
                "nudges_sent": nudges_sent
            }), 200
            
        elif nudge_type == 'tag':
            # Send tag-based nudges (e.g., "You haven't added any 'milestone' memories lately")
            tag = data.get('tag')
            if not tag:
                return jsonify({"error": "Tag is required for tag-based nudges"}), 400
            
            # Implementation similar to inactivity but with tag-specific logic
            # This would check for absence of specific tags in recent entries
            
            return jsonify({
                "status": "success", 
                "message": f"Tag nudges not yet implemented"
            }), 200
            
        else:
            return jsonify({"error": f"Unknown nudge type: {nudge_type}"}), 400
            
    except Exception as e:
        logger.error(f"Error sending nudges: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

def send_nudge_to_user(user_id, nudge_type):
    """
    Send a nudge to a specific user.
    This would typically integrate with Twilio for SMS or use another notification method.
    """
    try:
        # Get user data
        db = firebase.db
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            logger.error(f"User not found for nudge: {user_id}")
            return False
        
        user_data = user_doc.to_dict()
        phone_number = user_data.get('phone_number')
        
        if not phone_number:
            logger.error(f"No phone number for user: {user_id}")
            return False
        
        # Log the nudge
        nudge_ref = db.collection('nudges').document()
        nudge_ref.set({
            'user_id': user_id,
            'type': nudge_type,
            'timestamp': firebase.firestore.SERVER_TIMESTAMP,
            'status': 'pending'
        })
        
        # TODO: Implement actual sending via Twilio or other service
        # For now, just log it
        logger.info(f"Would send {nudge_type} nudge to user {user_id} at {phone_number}")
        
        # Update the nudge record
        nudge_ref.update({
            'status': 'sent'
        })
        
        return True
        
    except Exception as e:
        logger.error(f"Error sending nudge to user {user_id}: {str(e)}")
        return False
