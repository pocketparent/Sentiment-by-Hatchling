from flask import Blueprint, request, jsonify
import logging
import traceback
from firebase_admin import firestore
from datetime import datetime, timedelta
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

admin_bp = Blueprint("admin", __name__)
db = firestore.client()

@admin_bp.route("/users", methods=["GET"])
def get_users():
    """
    Get all users with pagination and filtering options.
    
    Query parameters:
    - limit: Maximum number of users to return (default: 20)
    - offset: Number of users to skip (default: 0)
    - status: Filter by subscription status (optional)
    - sort: Sort field (default: 'created_at')
    - order: Sort order ('asc' or 'desc', default: 'desc')
    """
    try:
        logger.info("📥 GET /api/admin/users hit!")
        
        # Get query parameters
        limit = request.args.get("limit", "20")
        offset = request.args.get("offset", "0")
        status = request.args.get("status")
        sort_field = request.args.get("sort", "created_at")
        sort_order = request.args.get("order", "desc")
        
        # Convert to appropriate types
        try:
            limit = int(limit)
            offset = int(offset)
        except ValueError:
            return jsonify({"error": "Invalid limit or offset value"}), 400
            
        # Validate sort order
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
            
        # Build query
        query = db.collection("users")
        
        # Apply status filter if provided
        if status:
            query = query.where("subscription_status", "==", status)
            
        # Apply sorting
        query = query.order_by(sort_field, direction=sort_order)
        
        # Get total count (for pagination)
        total_query = query
        total_docs = list(total_query.stream())
        total_count = len(total_docs)
        
        # Apply pagination
        query = query.limit(limit).offset(offset)
        
        # Execute query
        users = []
        for doc in query.stream():
            user_data = doc.to_dict()
            user_data["user_id"] = doc.id
            
            # Remove sensitive fields
            if "password_hash" in user_data:
                del user_data["password_hash"]
                
            users.append(user_data)
            
        return jsonify({
            "users": users,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }), 200
            
    except Exception as e:
        logger.error(f"❌ Error in GET /api/admin/users: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/users/<user_id>", methods=["GET"])
def get_user(user_id):
    """
    Get a specific user by ID.
    
    Path parameter:
    - user_id: Firebase user ID
    """
    try:
        logger.info(f"📥 GET /api/admin/users/{user_id} hit!")
        
        # Get user document
        user_doc = db.collection("users").document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
            
        # Get user data
        user_data = user_doc.to_dict()
        user_data["user_id"] = user_id
        
        # Remove sensitive fields
        if "password_hash" in user_data:
            del user_data["password_hash"]
            
        # Get user's entries count
        entries_query = db.collection("entries").where("author_id", "==", user_id).where("deleted_flag", "==", False)
        entries_count = len(list(entries_query.stream()))
        user_data["entries_count"] = entries_count
        
        return jsonify(user_data), 200
            
    except Exception as e:
        logger.error(f"❌ Error in GET /api/admin/users/{user_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/users/<user_id>", methods=["PATCH"])
def update_user(user_id):
    """
    Update a specific user by ID.
    
    Path parameter:
    - user_id: Firebase user ID
    
    Request body:
    - Any user fields to update
    """
    try:
        logger.info(f"📥 PATCH /api/admin/users/{user_id} hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        # Check if user exists
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
            
        # Prevent updating certain fields
        protected_fields = ["password_hash", "email", "user_id"]
        for field in protected_fields:
            if field in data:
                del data[field]
                
        # Update user
        user_ref.update(data)
        
        # Get updated user data
        updated_user = user_ref.get().to_dict()
        updated_user["user_id"] = user_id
        
        # Remove sensitive fields
        if "password_hash" in updated_user:
            del updated_user["password_hash"]
            
        return jsonify({
            "message": "User updated successfully",
            "user": updated_user
        }), 200
            
    except Exception as e:
        logger.error(f"❌ Error in PATCH /api/admin/users/{user_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/entries", methods=["GET"])
def get_entries():
    """
    Get all entries with pagination and filtering options.
    
    Query parameters:
    - limit: Maximum number of entries to return (default: 20)
    - offset: Number of entries to skip (default: 0)
    - user_id: Filter by user ID (optional)
    - start_date: Filter by start date (optional, format: YYYY-MM-DD)
    - end_date: Filter by end date (optional, format: YYYY-MM-DD)
    - sort: Sort field (default: 'timestamp_created')
    - order: Sort order ('asc' or 'desc', default: 'desc')
    """
    try:
        logger.info("📥 GET /api/admin/entries hit!")
        
        # Get query parameters
        limit = request.args.get("limit", "20")
        offset = request.args.get("offset", "0")
        user_id = request.args.get("user_id")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        sort_field = request.args.get("sort", "timestamp_created")
        sort_order = request.args.get("order", "desc")
        
        # Convert to appropriate types
        try:
            limit = int(limit)
            offset = int(offset)
        except ValueError:
            return jsonify({"error": "Invalid limit or offset value"}), 400
            
        # Validate sort order
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
            
        # Build query
        query = db.collection("entries").where("deleted_flag", "==", False)
        
        # Apply user filter if provided
        if user_id:
            query = query.where("author_id", "==", user_id)
            
        # Apply date filters if provided
        if start_date:
            try:
                start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.where("date_of_memory", ">=", start_date)
            except ValueError:
                return jsonify({"error": "Invalid start_date format, use YYYY-MM-DD"}), 400
                
        if end_date:
            try:
                end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
                # Add one day to include the end date
                end_datetime = end_datetime + timedelta(days=1)
                end_date_str = end_datetime.strftime("%Y-%m-%d")
                query = query.where("date_of_memory", "<", end_date_str)
            except ValueError:
                return jsonify({"error": "Invalid end_date format, use YYYY-MM-DD"}), 400
                
        # Apply sorting
        query = query.order_by(sort_field, direction=sort_order)
        
        # Get total count (for pagination)
        total_query = query
        total_docs = list(total_query.stream())
        total_count = len(total_docs)
        
        # Apply pagination
        query = query.limit(limit).offset(offset)
        
        # Execute query
        entries = []
        for doc in query.stream():
            entry_data = doc.to_dict()
            entry_data["entry_id"] = doc.id
            entries.append(entry_data)
            
        return jsonify({
            "entries": entries,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }), 200
            
    except Exception as e:
        logger.error(f"❌ Error in GET /api/admin/entries: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/stats", methods=["GET"])
def get_stats():
    """
    Get system-wide statistics.
    """
    try:
        logger.info("📥 GET /api/admin/stats hit!")
        
        # Get total users count
        users_query = db.collection("users")
        users_count = len(list(users_query.stream()))
        
        # Get users by subscription status
        status_counts = {}
        for status in ["none", "trialing", "active", "cancelled", "payment_failed", "payment_failed_final"]:
            status_query = db.collection("users").where("subscription_status", "==", status)
            status_counts[status] = len(list(status_query.stream()))
            
        # Get total entries count
        entries_query = db.collection("entries").where("deleted_flag", "==", False)
        entries_count = len(list(entries_query.stream()))
        
        # Get entries by source type
        source_counts = {}
        for source in ["app", "sms", "email"]:
            source_query = db.collection("entries").where("source_type", "==", source).where("deleted_flag", "==", False)
            source_counts[source] = len(list(source_query.stream()))
            
        # Get entries created in the last 30 days
        thirty_days_ago = datetime.now() - timedelta(days=30)
        thirty_days_ago_str = thirty_days_ago.strftime("%Y-%m-%d")
        recent_query = db.collection("entries").where("date_of_memory", ">=", thirty_days_ago_str).where("deleted_flag", "==", False)
        recent_count = len(list(recent_query.stream()))
        
        # Compile stats
        stats = {
            "users": {
                "total": users_count,
                "by_status": status_counts
            },
            "entries": {
                "total": entries_count,
                "by_source": source_counts,
                "last_30_days": recent_count
            }
        }
        
        return jsonify(stats), 200
            
    except Exception as e:
        logger.error(f"❌ Error in GET /api/admin/stats: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/permissions", methods=["GET"])
def get_permissions():
    """
    Get all available permissions and roles.
    """
    try:
        logger.info("📥 GET /api/admin/permissions hit!")
        
        # Define available permissions
        permissions = {
            "roles": {
                "admin": {
                    "description": "Full system access",
                    "capabilities": ["manage_users", "manage_entries", "manage_subscriptions", "view_stats", "manage_system"]
                },
                "user": {
                    "description": "Regular user with active subscription",
                    "capabilities": ["create_entries", "edit_own_entries", "delete_own_entries", "export_own_entries"]
                },
                "read_only": {
                    "description": "User with expired subscription",
                    "capabilities": ["view_own_entries"]
                }
            },
            "capabilities": {
                "manage_users": "Create, update, and delete users",
                "manage_entries": "Create, update, and delete any entry",
                "manage_subscriptions": "Manage subscription plans and user subscriptions",
                "view_stats": "View system-wide statistics",
                "manage_system": "Configure system settings",
                "create_entries": "Create new journal entries",
                "edit_own_entries": "Edit own journal entries",
                "delete_own_entries": "Delete own journal entries",
                "export_own_entries": "Export own journal entries",
                "view_own_entries": "View own journal entries"
            }
        }
        
        return jsonify(permissions), 200
            
    except Exception as e:
        logger.error(f"❌ Error in GET /api/admin/permissions: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/settings", methods=["GET"])
def get_settings():
    """
    Get system settings.
    """
    try:
        logger.info("📥 GET /api/admin/settings hit!")
        
        # Get settings document
        settings_doc = db.collection("system").document("settings").get()
        
        if not settings_doc.exists:
            # Create default settings if not exists
            default_settings = {
                "trial_days": 14,
                "default_privacy": "private",
                "allowed_media_types": ["image/jpeg", "image/png", "image/gif", "video/mp4", "audio/mpeg"],
                "max_media_size_mb": 10,
                "enable_ai_features": True,
                "enable_sms_features": True,
                "enable_export_features": True,
                "enable_nudges": True,
                "system_email": "support@myhatchling.ai",
                "last_updated": firestore.SERVER_TIMESTAMP
            }
            
            db.collection("system").document("settings").set(default_settings)
            settings = default_settings
        else:
            settings = settings_doc.to_dict()
            
        return jsonify(settings), 200
            
    except Exception as e:
        logger.error(f"❌ Error in GET /api/admin/settings: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/settings", methods=["PATCH"])
def update_settings():
    """
    Update system settings.
    
    Request body:
    - Any settings fields to update
    """
    try:
        logger.info("📥 PATCH /api/admin/settings hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        # Get settings document
        settings_ref = db.collection("system").document("settings")
        settings_doc = settings_ref.get()
        
        if not settings_doc.exists:
            # Create default settings if not exists
            default_settings = {
                "trial_days": 14,
                "default_privacy": "private",
                "allowed_media_types": ["image/jpeg", "image/png", "image/gif", "video/mp4", "audio/mpeg"],
                "max_media_size_mb": 10,
                "enable_ai_features": True,
                "enable_sms_features": True,
                "enable_export_features": True,
                "enable_nudges": True,
                "system_email": "support@myhatchling.ai"
            }
            settings_ref.set(default_settings)
            
        # Add last updated timestamp
        data["last_updated"] = firestore.SERVER_TIMESTAMP
        
        # Update settings
        settings_ref.update(data)
        
        # Get updated settings
        updated_settings = settings_ref.get().to_dict()
        
        return jsonify({
            "message": "Settings updated successfully",
            "settings": updated_settings
        }), 200
            
    except Exception as e:
        logger.error(f"❌ Error in PATCH /api/admin/settings: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
