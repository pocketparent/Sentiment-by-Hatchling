from flask import Blueprint, request, jsonify
import logging
from utils import firebase
from firebase_admin import firestore
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
auth_middleware_bp = Blueprint('auth_middleware', __name__)

def get_user_role(user_id):
    """
    Get the role of a user from Firestore.
    
    Args:
        user_id: The user ID to check
        
    Returns:
        Role string ('parent', 'co-parent', 'caregiver', 'admin') or None if not found
    """
    try:
        db = firebase.db
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            logger.warning(f"User not found: {user_id}")
            return None
            
        user_data = user_doc.to_dict()
        return user_data.get('role', 'caregiver')  # Default to lowest permission level
        
    except Exception as e:
        logger.error(f"Error getting user role: {str(e)}")
        return None

def require_role(required_roles):
    """
    Decorator to require specific roles for route access.
    
    Args:
        required_roles: List of roles that can access the route
        
    Returns:
        Decorator function
    """
    def decorator(f):
        def wrapped(*args, **kwargs):
            user_id = request.headers.get('X-User-ID')
            
            if not user_id:
                logger.warning("Missing user ID in request headers")
                return jsonify({"error": "Authentication required"}), 401
                
            user_role = get_user_role(user_id)
            
            if not user_role:
                logger.warning(f"User not found: {user_id}")
                return jsonify({"error": "User not found"}), 404
                
            if user_role not in required_roles:
                logger.warning(f"Unauthorized access attempt: {user_id} with role {user_role}")
                return jsonify({"error": "Insufficient permissions"}), 403
                
            return f(*args, **kwargs)
        wrapped.__name__ = f.__name__
        return wrapped
    return decorator

def require_entry_permission(action):
    """
    Decorator to check permissions for entry operations.
    
    Args:
        action: The action being performed ('view', 'edit', 'delete')
        
    Returns:
        Decorator function
    """
    def decorator(f):
        def wrapped(*args, **kwargs):
            user_id = request.headers.get('X-User-ID')
            entry_id = kwargs.get('entry_id')
            
            if not user_id:
                logger.warning("Missing user ID in request headers")
                return jsonify({"error": "Authentication required"}), 401
                
            if not entry_id:
                logger.warning("Missing entry ID in route parameters")
                return jsonify({"error": "Entry ID required"}), 400
                
            # Get user role
            user_role = get_user_role(user_id)
            
            if not user_role:
                logger.warning(f"User not found: {user_id}")
                return jsonify({"error": "User not found"}), 404
                
            # Admin can do anything
            if user_role == 'admin':
                return f(*args, **kwargs)
                
            # Get entry details
            try:
                db = firebase.db
                entry_ref = db.collection('entries').document(entry_id)
                entry_doc = entry_ref.get()
                
                if not entry_doc.exists:
                    logger.warning(f"Entry not found: {entry_id}")
                    return jsonify({"error": "Entry not found"}), 404
                    
                entry_data = entry_doc.to_dict()
                entry_author = entry_data.get('author_id')
                entry_privacy = entry_data.get('privacy', 'private')
                
                # Check permissions based on action and role
                if action == 'view':
                    # Anyone can view public entries
                    if entry_privacy == 'public':
                        return f(*args, **kwargs)
                        
                    # Author can always view their own entries
                    if entry_author == user_id:
                        return f(*args, **kwargs)
                        
                    # Shared entries can be viewed by co-parents
                    if entry_privacy == 'shared' and user_role in ['parent', 'co-parent']:
                        return f(*args, **kwargs)
                        
                    logger.warning(f"Unauthorized view attempt: {user_id} for entry {entry_id}")
                    return jsonify({"error": "You don't have permission to view this entry"}), 403
                    
                elif action in ['edit', 'delete']:
                    # Only author and parent can edit/delete
                    if entry_author == user_id or user_role == 'parent':
                        return f(*args, **kwargs)
                        
                    logger.warning(f"Unauthorized {action} attempt: {user_id} for entry {entry_id}")
                    return jsonify({"error": f"You don't have permission to {action} this entry"}), 403
                    
                else:
                    logger.error(f"Unknown action type: {action}")
                    return jsonify({"error": "Invalid permission check"}), 500
                    
            except Exception as e:
                logger.error(f"Error checking entry permissions: {str(e)}")
                return jsonify({"error": "Error checking permissions"}), 500
                
        wrapped.__name__ = f.__name__
        return wrapped
    return decorator
