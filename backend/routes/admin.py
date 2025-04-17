from flask import Blueprint, request, jsonify
import logging
import traceback
from firebase_admin import firestore
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firestore
db = firestore.client()

# Create blueprint
admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/users", methods=["GET"])
def get_users():
    """
    Get all users with optional filtering.
    
    Query parameters:
    - status: Filter by subscription status
    - plan: Filter by plan type
    - search: Search by name or email
    - limit: Maximum number of results to return
    - offset: Offset for pagination
    """
    try:
        logger.info("👥 Admin users endpoint hit")
        
        # Get query parameters
        status = request.args.get("status")
        plan = request.args.get("plan")
        search = request.args.get("search", "").lower()
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
        
        # Start with base query
        query = db.collection("users")
        
        # Apply filters if provided
        if status:
            query = query.where("subscription_status", "==", status)
            
        if plan:
            query = query.where("subscription_plan", "==", plan)
            
        # Execute query
        users = []
        for doc in query.stream():
            user = doc.to_dict()
            user["id"] = doc.id
            
            # Apply search filter (client-side since Firestore doesn't support case-insensitive search)
            if search:
                name = user.get("name", "").lower()
                email = user.get("email", "").lower()
                if search not in name and search not in email:
                    continue
                    
            users.append(user)
            
        # Apply pagination
        paginated_users = users[offset:offset + limit]
        
        # Format response
        formatted_users = []
        for user in paginated_users:
            formatted_users.append({
                "id": user.get("id"),
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "plan": user.get("subscription_plan", "none"),
                "status": user.get("subscription_status", "inactive"),
                "joined": user.get("created_at", ""),
                "last_login": user.get("last_login", ""),
                "entries_count": user.get("entries_count", 0),
                "phone_number": user.get("phone_number", "")
            })
        
        logger.info(f"✅ Returning {len(formatted_users)} users")
        
        return jsonify({
            "users": formatted_users,
            "total": len(users),
            "limit": limit,
            "offset": offset
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in admin users endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/subscriptions", methods=["GET"])
def get_subscriptions():
    """
    Get all subscriptions with optional filtering.
    
    Query parameters:
    - status: Filter by subscription status
    - plan: Filter by plan type
    - search: Search by customer name or email
    - limit: Maximum number of results to return
    - offset: Offset for pagination
    """
    try:
        logger.info("💳 Admin subscriptions endpoint hit")
        
        # Get query parameters
        status = request.args.get("status")
        plan = request.args.get("plan")
        search = request.args.get("search", "").lower()
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
        
        # Start with base query - get users with subscriptions
        query = db.collection("users").where("subscription_active", "==", True)
        
        # Apply filters if provided
        if status:
            query = query.where("subscription_status", "==", status)
            
        if plan:
            query = query.where("subscription_plan", "==", plan)
            
        # Execute query
        subscriptions = []
        for doc in query.stream():
            user = doc.to_dict()
            user_id = doc.id
            
            # Apply search filter (client-side since Firestore doesn't support case-insensitive search)
            if search:
                name = user.get("name", "").lower()
                email = user.get("email", "").lower()
                if search not in name and search not in email:
                    continue
                    
            # Format subscription data
            subscription = {
                "id": user.get("subscription_id", user_id),
                "customer_name": user.get("name", "Unknown"),
                "customer_email": user.get("email", ""),
                "customer_id": user_id,
                "plan": user.get("subscription_plan", "monthly"),
                "amount": 9.99 if user.get("subscription_plan") == "monthly" else 99.99,
                "status": user.get("subscription_status", "active"),
                "start_date": user.get("subscription_created", ""),
                "trial_end": user.get("subscription_trial_end", ""),
                "next_billing": calculate_next_billing(user),
                "payment_method": user.get("payment_method_id", "")
            }
            
            subscriptions.append(subscription)
            
        # Apply pagination
        paginated_subscriptions = subscriptions[offset:offset + limit]
        
        logger.info(f"✅ Returning {len(paginated_subscriptions)} subscriptions")
        
        return jsonify({
            "subscriptions": paginated_subscriptions,
            "total": len(subscriptions),
            "limit": limit,
            "offset": offset
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in admin subscriptions endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/search", methods=["GET"])
def search():
    """
    Global search across users, subscriptions, and entries.
    
    Query parameters:
    - q: Search query
    - type: Optional type filter ('users', 'subscriptions', 'entries')
    - limit: Maximum number of results to return per type
    """
    try:
        logger.info("🔍 Admin search endpoint hit")
        
        # Get query parameters
        query = request.args.get("q", "").lower()
        result_type = request.args.get("type")
        limit = int(request.args.get("limit", 20))
        
        if not query:
            return jsonify({"error": "Search query is required"}), 400
            
        results = {
            "users": [],
            "subscriptions": [],
            "entries": []
        }
        
        # Search users
        if not result_type or result_type == "users":
            users_query = db.collection("users").limit(100).stream()
            for doc in users_query:
                user = doc.to_dict()
                user_id = doc.id
                
                # Check if query matches user data
                name = user.get("name", "").lower()
                email = user.get("email", "").lower()
                phone = user.get("phone_number", "").lower()
                
                if query in name or query in email or query in phone:
                    results["users"].append({
                        "id": user_id,
                        "name": user.get("name", "Unknown"),
                        "email": user.get("email", ""),
                        "plan": user.get("subscription_plan", "none"),
                        "status": user.get("subscription_status", "inactive"),
                        "joined": user.get("created_at", "")
                    })
                    
                    if len(results["users"]) >= limit:
                        break
        
        # Search subscriptions
        if not result_type or result_type == "subscriptions":
            subs_query = db.collection("users").where("subscription_active", "==", True).limit(100).stream()
            for doc in subs_query:
                user = doc.to_dict()
                user_id = doc.id
                
                # Check if query matches subscription data
                name = user.get("name", "").lower()
                email = user.get("email", "").lower()
                plan = user.get("subscription_plan", "").lower()
                
                if query in name or query in email or query in plan:
                    results["subscriptions"].append({
                        "id": user.get("subscription_id", user_id),
                        "customer_name": user.get("name", "Unknown"),
                        "customer_email": user.get("email", ""),
                        "plan": user.get("subscription_plan", "monthly"),
                        "status": user.get("subscription_status", "active"),
                        "start_date": user.get("subscription_created", "")
                    })
                    
                    if len(results["subscriptions"]) >= limit:
                        break
        
        # Search entries
        if not result_type or result_type == "entries":
            entries_query = db.collection("entries").where("deleted_flag", "==", False).limit(100).stream()
            for doc in entries_query:
                entry = doc.to_dict()
                entry_id = doc.id
                
                # Check if query matches entry data
                content = entry.get("content", "").lower()
                tags = [tag.lower() for tag in entry.get("tags", [])]
                
                if query in content or any(query in tag for tag in tags):
                    results["entries"].append({
                        "id": entry_id,
                        "content": entry.get("content", "")[:100] + "..." if len(entry.get("content", "")) > 100 else entry.get("content", ""),
                        "author_id": entry.get("author_id", ""),
                        "date_of_memory": entry.get("date_of_memory", ""),
                        "tags": entry.get("tags", []),
                        "privacy": entry.get("privacy", "private")
                    })
                    
                    if len(results["entries"]) >= limit:
                        break
        
        logger.info(f"✅ Search results: {len(results['users'])} users, {len(results['subscriptions'])} subscriptions, {len(results['entries'])} entries")
        
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f"❌ Error in admin search endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/stats", methods=["GET"])
def get_stats():
    """
    Get admin dashboard statistics.
    """
    try:
        logger.info("📊 Admin stats endpoint hit")
        
        # Get current timestamp
        now = datetime.now()
        
        # Get total users count
        users_count = len(list(db.collection("users").stream()))
        
        # Get active subscriptions count
        active_subs_count = len(list(db.collection("users").where("subscription_active", "==", True).stream()))
        
        # Get total entries count
        entries_count = len(list(db.collection("entries").where("deleted_flag", "==", False).stream()))
        
        # Calculate MRR (Monthly Recurring Revenue)
        monthly_subs = len(list(db.collection("users").where("subscription_active", "==", True).where("subscription_plan", "==", "monthly").stream()))
        annual_subs = len(list(db.collection("users").where("subscription_active", "==", True).where("subscription_plan", "==", "annual").stream()))
        
        mrr = (monthly_subs * 9.99) + (annual_subs * 99.99 / 12)
        
        # Get trial users count
        trial_users_count = len(list(db.collection("users").where("subscription_status", "==", "trialing").stream()))
        
        # Calculate trial conversion rate (simplified)
        converted_trials = len(list(db.collection("users").where("subscription_active", "==", True).where("subscription_status", "==", "active").stream()))
        trial_conversion_rate = (converted_trials / (converted_trials + trial_users_count)) * 100 if (converted_trials + trial_users_count) > 0 else 0
        
        # Get entries created in last 30 days
        # Note: This is simplified - in a real implementation, you'd use a timestamp comparison
        recent_entries_count = entries_count // 2  # Simplified for demo
        
        stats = {
            "users": {
                "total": users_count,
                "active": users_count - trial_users_count,
                "trialing": trial_users_count
            },
            "subscriptions": {
                "total": active_subs_count,
                "monthly": monthly_subs,
                "annual": annual_subs,
                "mrr": round(mrr, 2),
                "trial_conversion_rate": round(trial_conversion_rate, 1)
            },
            "entries": {
                "total": entries_count,
                "recent": recent_entries_count
            },
            "timestamp": now.isoformat()
        }
        
        logger.info("✅ Admin stats retrieved successfully")
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"❌ Error in admin stats endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/user/<user_id>", methods=["GET"])
def get_user(user_id):
    """
    Get detailed information about a specific user.
    
    Path parameters:
    - user_id: ID of the user
    """
    try:
        logger.info(f"👤 Admin user detail endpoint hit for user {user_id}")
        
        # Get user document
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            logger.warning(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
            
        user = user_doc.to_dict()
        
        # Get user's entries
        entries_query = db.collection("entries").where("author_id", "==", user_id).where("deleted_flag", "==", False).stream()
        entries = []
        for doc in entries_query:
            entry = doc.to_dict()
            entry["id"] = doc.id
            entries.append(entry)
            
        # Format user data
        user_data = {
            "id": user_id,
            "profile": {
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "phone_number": user.get("phone_number", ""),
                "created_at": user.get("created_at", ""),
                "last_login": user.get("last_login", "")
            },
            "subscription": {
                "active": user.get("subscription_active", False),
                "plan": user.get("subscription_plan", "none"),
                "status": user.get("subscription_status", "inactive"),
                "trial_end": user.get("subscription_trial_end", ""),
                "created": user.get("subscription_created", ""),
                "updated": user.get("subscription_updated_at", ""),
                "cancelled": user.get("subscription_cancelled_at", ""),
                "payment_method": user.get("payment_method_id", "")
            },
            "usage": {
                "entries_count": len(entries),
                "last_entry": entries[0].get("timestamp_created", "") if entries else "",
                "storage_used": calculate_storage_used(entries),
                "sms_entries_count": len([e for e in entries if e.get("source_type") == "sms"])
            }
        }
        
        logger.info(f"✅ User detail retrieved for {user_id}")
        
        return jsonify(user_data), 200
        
    except Exception as e:
        logger.error(f"❌ Error in admin user detail endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@admin_bp.route("/user/<user_id>", methods=["PATCH"])
def update_user(user_id):
    """
    Update a user's information.
    
    Path parameters:
    - user_id: ID of the user
    
    Request body:
    - name: User's name
    - email: User's email
    - subscription_status: Subscription status
    - subscription_plan: Subscription plan
    """
    try:
        logger.info(f"✏️ Admin user update endpoint hit for user {user_id}")
        
        # Get request data
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Get user document
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            logger.warning(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
            
        # Prepare update data
        update_data = {}
        
        if "name" in data:
            update_data["name"] = data["name"]
            
        if "email" in data:
            update_data["email"] = data["email"]
            
        if "subscription_status" in data:
            update_data["subscription_status"] = data["subscription_status"]
            
            # If status is changed to cancelled, update subscription_active
            if data["subscription_status"] == "cancelled":
                update_data["subscription_active"] = False
                update_data["subscription_cancelled_at"] = firestore.SERVER_TIMESTAMP
            elif data["subscription_status"] == "active":
                update_data["subscription_active"] = True
                
        if "subscription_plan" in data:
            update_data["subscription_plan"] = data["subscription_plan"]
            update_data["subscription_updated_at"] = firestore.SERVER_TIMESTAMP
            
        # Update user document
        user_ref.update(update_data)
        
        logger.info(f"✅ User {user_id} updated successfully")
        
        return jsonify({
            "success": True,
            "message": "User updated successfully",
            "updated_fields": list(update_data.keys())
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in admin user update endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

# Helper functions
def calculate_next_billing(user):
    """Calculate the next billing date based on subscription data."""
    # This is a simplified implementation
    if user.get("subscription_status") == "trialing":
        trial_end = user.get("subscription_trial_end")
        if trial_end:
            return trial_end
    
    # For active subscriptions, we'd calculate based on the last payment date
    # This is simplified for the demo
    return "2023-06-01"  # Placeholder

def calculate_storage_used(entries):
    """Calculate storage used by entries in MB."""
    # This is a simplified implementation
    # In a real app, you'd calculate based on actual media file sizes
    total_bytes = 0
    for entry in entries:
        # Estimate text content size
        content_bytes = len(entry.get("content", "")) * 2  # Unicode chars
        
        # Estimate media size
        if entry.get("media_url"):
            # Assume average media size of 2MB
            media_bytes = 2 * 1024 * 1024
            total_bytes += media_bytes
            
        total_bytes += content_bytes
        
    # Convert to MB
    total_mb = total_bytes / (1024 * 1024)
    return round(total_mb, 2)
