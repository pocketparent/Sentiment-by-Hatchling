import functools
from flask import request, jsonify, g
import logging
import traceback
from firebase_admin import firestore
import jwt
import os
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firestore
db = firestore.client()

def get_token_from_request():
    """Extract token from Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    return auth_header.split(' ')[1]

def get_user_id_from_request():
    """Extract user ID from X-User-ID header."""
    return request.headers.get('X-User-ID')

def verify_token(token):
    """Verify JWT token and return payload."""
    try:
        secret = os.environ.get('JWT_SECRET')
        if not secret:
            logger.error("JWT_SECRET not set in environment")
            return None
            
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def get_user_permissions(user_id):
    """Get user permissions from Firestore."""
    try:
        if not user_id:
            return None
            
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return None
            
        user_data = user_doc.to_dict()
        
        # Get role or permissions
        role = user_data.get('role', 'user')
        permissions = user_data.get('permissions', 'read_only')
        
        return {
            'user_id': user_id,
            'role': role,
            'permissions': permissions,
            'subscription_status': user_data.get('subscription_status', 'none')
        }
    except Exception as e:
        logger.error(f"Error getting user permissions: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def authenticate(f):
    """Decorator to authenticate user and set user context."""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token and user ID
        token = get_token_from_request()
        user_id = get_user_id_from_request()
        
        # Verify token if provided
        if token:
            payload = verify_token(token)
            if payload:
                # Token is valid, set user ID from token
                user_id = payload.get('user_id')
        
        # Get user permissions
        if user_id:
            user_context = get_user_permissions(user_id)
            if user_context:
                # Set user context in Flask g object
                g.user = user_context
                return f(*args, **kwargs)
        
        # Authentication failed
        return jsonify({"error": "Authentication required"}), 401
    
    return decorated_function

def require_permissions(required_permissions):
    """Decorator to check if user has required permissions."""
    def decorator(f):
        @functools.wraps(f)
        @authenticate
        def decorated_function(*args, **kwargs):
            # Check if user has admin role (full access)
            if g.user.get('role') == 'admin':
                return f(*args, **kwargs)
                
            # Check if user has required permissions
            user_permissions = g.user.get('permissions')
            
            # Full permissions
            if user_permissions == 'full':
                return f(*args, **kwargs)
                
            # Read-only permissions (limited access)
            if user_permissions == 'read_only' and required_permissions == 'read_only':
                return f(*args, **kwargs)
                
            # Permission denied
            return jsonify({"error": "Permission denied"}), 403
        
        return decorated_function
    
    return decorator

def require_admin(f):
    """Decorator to check if user has admin role."""
    @functools.wraps(f)
    @authenticate
    def decorated_function(*args, **kwargs):
        # Check if user has admin role
        if g.user.get('role') == 'admin':
            return f(*args, **kwargs)
            
        # Permission denied
        return jsonify({"error": "Admin access required"}), 403
    
    return decorated_function

def require_self_or_admin(user_id_param='user_id'):
    """Decorator to check if user is accessing their own data or has admin role."""
    def decorator(f):
        @functools.wraps(f)
        @authenticate
        def decorated_function(*args, **kwargs):
            # Get target user ID from route parameter
            target_user_id = kwargs.get(user_id_param)
            
            # Check if user has admin role
            if g.user.get('role') == 'admin':
                return f(*args, **kwargs)
                
            # Check if user is accessing their own data
            if g.user.get('user_id') == target_user_id:
                return f(*args, **kwargs)
                
            # Permission denied
            return jsonify({"error": "Permission denied"}), 403
        
        return decorated_function
    
    return decorator

def check_subscription_status(f):
    """Decorator to check if user's subscription is active."""
    @functools.wraps(f)
    @authenticate
    def decorated_function(*args, **kwargs):
        # Check if user has admin role (bypass subscription check)
        if g.user.get('role') == 'admin':
            return f(*args, **kwargs)
            
        # Check subscription status
        status = g.user.get('subscription_status')
        
        # Allow access for active or trialing subscriptions
        if status in ['active', 'trialing']:
            return f(*args, **kwargs)
            
        # Subscription inactive
        return jsonify({
            "error": "Subscription required",
            "status": status,
            "message": "Your subscription is not active. Please renew your subscription to access this feature."
        }), 402
    
    return decorated_function
