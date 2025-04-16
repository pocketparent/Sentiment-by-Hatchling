from flask import Blueprint, request, jsonify
from firebase_admin import firestore
import logging
import uuid
from datetime import datetime, timedelta
from utils.auth_middleware import require_role
import os
from twilio.rest import Client

# Configure logging
logger = logging.getLogger(__name__)

invite_bp = Blueprint('invite', __name__)

@invite_bp.route('/send', methods=['POST'])
@require_role(['parent', 'admin'])
def send_invite():
    """
    Send an invitation to a caregiver or co-parent.
    
    Required fields:
    - phone_number: Phone number to send invite to
    - role: Role to assign ('co-parent' or 'caregiver')
    
    Optional fields:
    - name: Name of the invitee
    - message: Custom message to include
    """
    try:
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Invalid request data"}), 400
            
        # Get required fields
        phone_number = data.get('phone_number')
        role = data.get('role')
        
        # Get optional fields
        name = data.get('name', 'Someone')
        message = data.get('message', '')
        
        # Validate required fields
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
            
        # Validate role
        valid_roles = ['co-parent', 'caregiver']
        if not role or role not in valid_roles:
            return jsonify({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}), 400
            
        # Get user ID from header
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Generate invite code
        invite_code = str(uuid.uuid4())[:8]
        
        # Store invite in Firestore
        db = firestore.client()
        invite_ref = db.collection('invites').document(invite_code)
        
        invite_data = {
            'code': invite_code,
            'phone_number': phone_number,
            'role': role,
            'inviter_id': user_id,
            'name': name,
            'status': 'pending',
            'created_at': firestore.SERVER_TIMESTAMP,
            'expires_at': datetime.now() + timedelta(days=7)  # 7-day expiration
        }
        
        invite_ref.set(invite_data)
        logger.info(f"Created invite {invite_code} for {phone_number} with role {role}")
        
        # Send SMS invitation
        try:
            send_invite_sms(phone_number, invite_code, role, name, user_id, message)
            invite_ref.update({'sms_sent': True})
        except Exception as e:
            logger.error(f"Failed to send SMS invite: {str(e)}")
            invite_ref.update({'sms_sent': False, 'sms_error': str(e)})
            # Continue anyway - we'll show the invite code in the response
        
        return jsonify({
            "status": "success",
            "message": "Invitation sent",
            "invite_code": invite_code
        }), 200
        
    except Exception as e:
        logger.error(f"Error sending invite: {str(e)}")
        return jsonify({"error": "Failed to send invitation", "details": str(e)}), 500

@invite_bp.route('/accept', methods=['POST'])
def accept_invite():
    """
    Accept an invitation and create a user account.
    
    Required fields:
    - code: Invitation code
    - phone_number: Phone number that received the invite
    """
    try:
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Invalid request data"}), 400
            
        # Get required fields
        invite_code = data.get('code')
        phone_number = data.get('phone_number')
        
        # Validate required fields
        if not invite_code or not phone_number:
            return jsonify({"error": "Invite code and phone number are required"}), 400
            
        # Check if invite exists and is valid
        db = firestore.client()
        invite_ref = db.collection('invites').document(invite_code)
        invite_doc = invite_ref.get()
        
        if not invite_doc.exists:
            return jsonify({"error": "Invalid invite code"}), 404
            
        invite_data = invite_doc.to_dict()
        
        # Check if invite is expired
        if 'expires_at' in invite_data and datetime.now() > invite_data['expires_at']:
            return jsonify({"error": "Invite has expired"}), 400
            
        # Check if invite is for this phone number
        if invite_data.get('phone_number') != phone_number:
            return jsonify({"error": "Phone number does not match invite"}), 400
            
        # Check if invite is already accepted
        if invite_data.get('status') == 'accepted':
            return jsonify({"error": "Invite has already been accepted"}), 400
            
        # Create or update user account
        users_ref = db.collection('users')
        query = users_ref.where('phone_number', '==', phone_number).limit(1)
        user_docs = query.get()
        
        if user_docs:
            # User already exists, update role if needed
            user_doc = user_docs[0]
            user_id = user_doc.id
            user_data = user_doc.to_dict()
            
            # Only upgrade role (never downgrade)
            current_role = user_data.get('role', 'caregiver')
            new_role = invite_data.get('role', 'caregiver')
            
            role_hierarchy = {
                'admin': 3,
                'parent': 2,
                'co-parent': 1,
                'caregiver': 0
            }
            
            if role_hierarchy.get(new_role, 0) > role_hierarchy.get(current_role, 0):
                users_ref.document(user_id).update({'role': new_role})
                logger.info(f"Updated user {user_id} role from {current_role} to {new_role}")
        else:
            # Create new user
            new_user = {
                'phone_number': phone_number,
                'role': invite_data.get('role', 'caregiver'),
                'created_at': firestore.SERVER_TIMESTAMP,
                'invited_by': invite_data.get('inviter_id'),
                'status': 'active'
            }
            
            user_ref = users_ref.add(new_user)
            user_id = user_ref[1].id
            logger.info(f"Created new user {user_id} with role {new_user['role']}")
        
        # Update invite status
        invite_ref.update({
            'status': 'accepted',
            'accepted_at': firestore.SERVER_TIMESTAMP,
            'user_id': user_id
        })
        
        return jsonify({
            "status": "success",
            "message": "Invitation accepted",
            "user_id": user_id,
            "role": invite_data.get('role')
        }), 200
        
    except Exception as e:
        logger.error(f"Error accepting invite: {str(e)}")
        return jsonify({"error": "Failed to accept invitation", "details": str(e)}), 500

@invite_bp.route('/revoke', methods=['POST'])
@require_role(['parent', 'admin'])
def revoke_invite():
    """
    Revoke an invitation or remove a user's access.
    
    Required fields:
    - type: 'invite' or 'user'
    - id: Invite code or user ID to revoke
    """
    try:
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Invalid request data"}), 400
            
        # Get required fields
        revoke_type = data.get('type')
        revoke_id = data.get('id')
        
        # Validate required fields
        if not revoke_type or not revoke_id:
            return jsonify({"error": "Type and ID are required"}), 400
            
        # Validate type
        if revoke_type not in ['invite', 'user']:
            return jsonify({"error": "Type must be 'invite' or 'user'"}), 400
            
        # Get user ID from header
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        db = firestore.client()
        
        if revoke_type == 'invite':
            # Revoke invitation
            invite_ref = db.collection('invites').document(revoke_id)
            invite_doc = invite_ref.get()
            
            if not invite_doc.exists:
                return jsonify({"error": "Invite not found"}), 404
                
            invite_data = invite_doc.to_dict()
            
            # Check if user has permission to revoke
            if invite_data.get('inviter_id') != user_id:
                # Check if user is admin
                user_ref = db.collection('users').document(user_id)
                user_doc = user_ref.get()
                
                if not user_doc.exists or user_doc.to_dict().get('role') != 'admin':
                    return jsonify({"error": "You don't have permission to revoke this invite"}), 403
            
            # Update invite status
            invite_ref.update({
                'status': 'revoked',
                'revoked_at': firestore.SERVER_TIMESTAMP,
                'revoked_by': user_id
            })
            
            return jsonify({
                "status": "success",
                "message": "Invitation revoked"
            }), 200
            
        else:  # revoke_type == 'user'
            # Revoke user access
            target_user_ref = db.collection('users').document(revoke_id)
            target_user_doc = target_user_ref.get()
            
            if not target_user_doc.exists:
                return jsonify({"error": "User not found"}), 404
                
            target_user_data = target_user_doc.to_dict()
            
            # Check if user has permission to revoke
            if target_user_data.get('invited_by') != user_id:
                # Check if user is admin
                user_ref = db.collection('users').document(user_id)
                user_doc = user_ref.get()
                
                if not user_doc.exists or user_doc.to_dict().get('role') != 'admin':
                    return jsonify({"error": "You don't have permission to revoke this user's access"}), 403
            
            # Cannot revoke parent or admin access
            if target_user_data.get('role') in ['parent', 'admin']:
                return jsonify({"error": "Cannot revoke parent or admin access"}), 400
            
            # Update user status
            target_user_ref.update({
                'status': 'revoked',
                'revoked_at': firestore.SERVER_TIMESTAMP,
                'revoked_by': user_id
            })
            
            return jsonify({
                "status": "success",
                "message": "User access revoked"
            }), 200
            
    except Exception as e:
        logger.error(f"Error revoking access: {str(e)}")
        return jsonify({"error": "Failed to revoke access", "details": str(e)}), 500

def send_invite_sms(phone_number, invite_code, role, name, inviter_id, custom_message=""):
    """Send SMS invitation using Twilio"""
    try:
        # Get Twilio credentials from environment
        account_sid = os.environ.get('TWILIO_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        from_number = os.environ.get('TWILIO_PHONE_NUMBER')
        
        if not account_sid or not auth_token or not from_number:
            raise ValueError("Twilio credentials not configured")
            
        # Get inviter name
        db = firestore.client()
        inviter_ref = db.collection('users').document(inviter_id)
        inviter_doc = inviter_ref.get()
        
        inviter_name = "Someone"
        if inviter_doc.exists:
            inviter_data = inviter_doc.to_dict()
            inviter_name = inviter_data.get('name', "Someone")
            
        # Create message
        role_display = "co-parent" if role == "co-parent" else "caregiver"
        base_url = "https://myhatchling.ai/invite"
        
        message = f"{inviter_name} has invited you to be a {role_display} on Hatchling! "
        
        if custom_message:
            message += f"They said: \"{custom_message}\" "
            
        message += f"Use code {invite_code} at {base_url} to accept."
        
        # Send message
        client = Client(account_sid, auth_token)
        client.messages.create(
            body=message,
            from_=from_number,
            to=phone_number
        )
        
        logger.info(f"Sent invite SMS to {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send SMS: {str(e)}")
        raise
