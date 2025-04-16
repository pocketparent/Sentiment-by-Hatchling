from flask import Blueprint, request, jsonify
import logging
import traceback
from firebase_admin import firestore
from datetime import datetime, timedelta
import uuid
from utils.auth import authenticate, require_permissions, require_admin, check_subscription_status
from utils.twilio_client import send_sms

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

nudge_bp = Blueprint("nudge", __name__)
db = firestore.client()

@nudge_bp.route("", methods=["POST"])
@nudge_bp.route("/", methods=["POST"])
@authenticate
@check_subscription_status
def create_nudge():
    """
    Create a new nudge reminder.
    
    Request body:
    - user_id: ID of the user to nudge
    - message: Custom message for the nudge (optional)
    - schedule_time: When to send the nudge (ISO format)
    - repeat: Repeat pattern ('none', 'daily', 'weekly', 'monthly')
    - active: Whether the nudge is active (default: true)
    """
    try:
        logger.info("📥 POST /api/nudge hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        user_id = data.get("user_id")
        message = data.get("message", "Time to add a memory to your Hatchling journal!")
        schedule_time = data.get("schedule_time")
        repeat = data.get("repeat", "none")
        active = data.get("active", True)
        
        # Validate required fields
        if not user_id or not schedule_time:
            return jsonify({"error": "Missing required fields: user_id or schedule_time"}), 400
            
        # Validate repeat pattern
        valid_repeat_patterns = ["none", "daily", "weekly", "monthly"]
        if repeat not in valid_repeat_patterns:
            return jsonify({"error": f"Invalid repeat pattern. Must be one of: {', '.join(valid_repeat_patterns)}"}), 400
            
        # Validate schedule time format
        try:
            schedule_datetime = datetime.fromisoformat(schedule_time)
        except ValueError:
            return jsonify({"error": "Invalid schedule_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}), 400
            
        # Create nudge
        nudge = {
            "user_id": user_id,
            "message": message,
            "schedule_time": schedule_time,
            "repeat": repeat,
            "active": active,
            "created_at": firestore.SERVER_TIMESTAMP,
            "last_sent": None,
            "next_send": schedule_time
        }
        
        # Save to Firestore
        nudge_id = str(uuid.uuid4())
        db.collection("nudges").document(nudge_id).set(nudge)
        
        # Add nudge_id to the response
        nudge["nudge_id"] = nudge_id
        
        logger.info(f"✅ Nudge created: {nudge_id}")
        return jsonify({
            "status": "created",
            "nudge": nudge
        }), 201
        
    except Exception as e:
        logger.error(f"❌ Error in POST /api/nudge: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Nudge creation failed", "details": str(e)}), 500

@nudge_bp.route("", methods=["GET"])
@nudge_bp.route("/", methods=["GET"])
@authenticate
def get_nudges():
    """
    Get nudges for a user.
    
    Query parameters:
    - user_id: ID of the user to get nudges for
    - active_only: Whether to return only active nudges (default: false)
    """
    try:
        logger.info("📥 GET /api/nudge hit!")
        
        # Get query parameters
        user_id = request.args.get("user_id")
        active_only = request.args.get("active_only", "false").lower() == "true"
        
        # Validate required parameters
        if not user_id:
            return jsonify({"error": "Missing required parameter: user_id"}), 400
            
        # Build query
        query = db.collection("nudges").where("user_id", "==", user_id)
        
        # Filter by active status if requested
        if active_only:
            query = query.where("active", "==", True)
            
        # Execute query
        nudges = []
        for doc in query.stream():
            nudge = doc.to_dict()
            nudge["nudge_id"] = doc.id
            nudges.append(nudge)
            
        logger.info(f"✅ Retrieved {len(nudges)} nudges for user {user_id}")
        return jsonify({"nudges": nudges}), 200
        
    except Exception as e:
        logger.error(f"❌ Error in GET /api/nudge: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to retrieve nudges", "details": str(e)}), 500

@nudge_bp.route("/<nudge_id>", methods=["GET"])
@authenticate
def get_nudge(nudge_id):
    """
    Get a specific nudge by ID.
    
    Path parameter:
    - nudge_id: ID of the nudge to retrieve
    """
    try:
        logger.info(f"📥 GET /api/nudge/{nudge_id} hit!")
        
        # Get nudge document
        nudge_ref = db.collection("nudges").document(nudge_id)
        nudge_doc = nudge_ref.get()
        
        if not nudge_doc.exists:
            logger.warning(f"Nudge not found: {nudge_id}")
            return jsonify({"error": "Nudge not found"}), 404
            
        # Get nudge data
        nudge = nudge_doc.to_dict()
        nudge["nudge_id"] = nudge_id
        
        logger.info(f"✅ Retrieved nudge: {nudge_id}")
        return jsonify(nudge), 200
        
    except Exception as e:
        logger.error(f"❌ Error in GET /api/nudge/{nudge_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to retrieve nudge", "details": str(e)}), 500

@nudge_bp.route("/<nudge_id>", methods=["PATCH"])
@authenticate
@check_subscription_status
def update_nudge(nudge_id):
    """
    Update an existing nudge.
    
    Path parameter:
    - nudge_id: ID of the nudge to update
    
    Request body:
    - message: Updated message (optional)
    - schedule_time: Updated schedule time (optional)
    - repeat: Updated repeat pattern (optional)
    - active: Updated active status (optional)
    """
    try:
        logger.info(f"📥 PATCH /api/nudge/{nudge_id} hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        # Check if nudge exists
        nudge_ref = db.collection("nudges").document(nudge_id)
        nudge_doc = nudge_ref.get()
        
        if not nudge_doc.exists:
            logger.warning(f"Nudge not found for update: {nudge_id}")
            return jsonify({"error": "Nudge not found"}), 404
            
        # Get existing nudge data
        existing_nudge = nudge_doc.to_dict()
        
        # Prepare update data
        update_data = {}
        
        # Message
        if "message" in data:
            update_data["message"] = data["message"]
            
        # Schedule time
        if "schedule_time" in data:
            schedule_time = data["schedule_time"]
            try:
                schedule_datetime = datetime.fromisoformat(schedule_time)
                update_data["schedule_time"] = schedule_time
                
                # Update next_send if schedule_time changes
                if existing_nudge.get("next_send") == existing_nudge.get("schedule_time"):
                    update_data["next_send"] = schedule_time
            except ValueError:
                return jsonify({"error": "Invalid schedule_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}), 400
                
        # Repeat pattern
        if "repeat" in data:
            repeat = data["repeat"]
            valid_repeat_patterns = ["none", "daily", "weekly", "monthly"]
            if repeat in valid_repeat_patterns:
                update_data["repeat"] = repeat
            else:
                return jsonify({"error": f"Invalid repeat pattern. Must be one of: {', '.join(valid_repeat_patterns)}"}), 400
                
        # Active status
        if "active" in data:
            update_data["active"] = bool(data["active"])
            
        # Update the nudge
        nudge_ref.update(update_data)
        logger.info(f"✅ Nudge {nudge_id} updated successfully")
        
        # Get the updated nudge to return
        updated_nudge = nudge_ref.get().to_dict()
        updated_nudge["nudge_id"] = nudge_id
        
        return jsonify({
            "status": "updated",
            "nudge": updated_nudge
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in PATCH /api/nudge/{nudge_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Update failed", "details": str(e)}), 500

@nudge_bp.route("/<nudge_id>", methods=["DELETE"])
@authenticate
@check_subscription_status
def delete_nudge(nudge_id):
    """
    Delete a nudge.
    
    Path parameter:
    - nudge_id: ID of the nudge to delete
    """
    try:
        logger.info(f"🗑️ DELETE /api/nudge/{nudge_id} hit")
        
        # Check if nudge exists
        nudge_ref = db.collection("nudges").document(nudge_id)
        nudge_doc = nudge_ref.get()
        
        if not nudge_doc.exists:
            logger.warning(f"Nudge not found for deletion: {nudge_id}")
            return jsonify({"error": "Nudge not found"}), 404
            
        # Delete the nudge
        nudge_ref.delete()
        logger.info(f"✅ Nudge {nudge_id} deleted")
        
        return jsonify({"status": "deleted", "nudge_id": nudge_id}), 200
        
    except Exception as e:
        logger.error(f"❌ Error in DELETE /api/nudge/{nudge_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Delete failed", "details": str(e)}), 500

@nudge_bp.route("/process", methods=["POST"])
@authenticate
@require_admin
def process_nudges():
    """
    Process due nudges and send notifications.
    This endpoint is intended to be called by a scheduler/cron job.
    
    Request body:
    - dry_run: Whether to simulate processing without sending (default: false)
    """
    try:
        logger.info("📥 POST /api/nudge/process hit!")
        
        # Get request data
        data = request.json or {}
        dry_run = data.get("dry_run", False)
        
        # Get current time
        now = datetime.now().isoformat()
        
        # Find nudges that are due
        query = db.collection("nudges").where("active", "==", True).where("next_send", "<=", now)
        
        # Process nudges
        processed_count = 0
        sent_count = 0
        errors = []
        
        for doc in query.stream():
            try:
                nudge = doc.to_dict()
                nudge_id = doc.id
                user_id = nudge.get("user_id")
                
                # Get user data for phone number
                user_doc = db.collection("users").document(user_id).get()
                if not user_doc.exists:
                    logger.warning(f"User not found for nudge {nudge_id}: {user_id}")
                    errors.append(f"User not found: {user_id}")
                    continue
                    
                user = user_doc.to_dict()
                phone_number = user.get("phone_number")
                
                if not phone_number:
                    logger.warning(f"No phone number for user {user_id}")
                    errors.append(f"No phone number for user: {user_id}")
                    continue
                    
                # Calculate next send time based on repeat pattern
                next_send = None
                if nudge.get("repeat") == "none":
                    # One-time nudge, deactivate after sending
                    next_send = None
                    db.collection("nudges").document(nudge_id).update({
                        "active": False,
                        "last_sent": firestore.SERVER_TIMESTAMP
                    })
                else:
                    # Calculate next send time based on repeat pattern
                    schedule_time = datetime.fromisoformat(nudge.get("schedule_time"))
                    if nudge.get("repeat") == "daily":
                        next_send = (datetime.now() + timedelta(days=1)).replace(
                            hour=schedule_time.hour,
                            minute=schedule_time.minute,
                            second=schedule_time.second
                        ).isoformat()
                    elif nudge.get("repeat") == "weekly":
                        next_send = (datetime.now() + timedelta(weeks=1)).replace(
                            hour=schedule_time.hour,
                            minute=schedule_time.minute,
                            second=schedule_time.second
                        ).isoformat()
                    elif nudge.get("repeat") == "monthly":
                        # Get same day next month, or last day if day doesn't exist
                        current_month = datetime.now().month
                        next_month = current_month + 1 if current_month < 12 else 1
                        next_year = datetime.now().year + 1 if current_month == 12 else datetime.now().year
                        
                        # Try to create date with same day in next month
                        try:
                            next_send = datetime(
                                year=next_year,
                                month=next_month,
                                day=schedule_time.day,
                                hour=schedule_time.hour,
                                minute=schedule_time.minute,
                                second=schedule_time.second
                            ).isoformat()
                        except ValueError:
                            # If day doesn't exist in next month, use last day
                            if next_month == 2:
                                # February special case
                                last_day = 29 if (next_year % 4 == 0 and (next_year % 100 != 0 or next_year % 400 == 0)) else 28
                            elif next_month in [4, 6, 9, 11]:
                                last_day = 30
                            else:
                                last_day = 31
                                
                            next_send = datetime(
                                year=next_year,
                                month=next_month,
                                day=last_day,
                                hour=schedule_time.hour,
                                minute=schedule_time.minute,
                                second=schedule_time.second
                            ).isoformat()
                    
                    # Update nudge with next send time
                    db.collection("nudges").document(nudge_id).update({
                        "last_sent": firestore.SERVER_TIMESTAMP,
                        "next_send": next_send
                    })
                
                # Send the nudge if not a dry run
                if not dry_run:
                    result = send_sms(phone_number, nudge.get("message"))
                    if result.get("success"):
                        sent_count += 1
                    else:
                        errors.append(f"Failed to send to {phone_number}: {result.get('error')}")
                
                processed_count += 1
                logger.info(f"✅ Processed nudge {nudge_id} for user {user_id}")
                
            except Exception as e:
                logger.error(f"❌ Error processing nudge {doc.id}: {str(e)}")
                errors.append(f"Error processing nudge {doc.id}: {str(e)}")
        
        return jsonify({
            "status": "completed",
            "processed_count": processed_count,
            "sent_count": sent_count if not dry_run else 0,
            "dry_run": dry_run,
            "errors": errors
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in POST /api/nudge/process: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Processing failed", "details": str(e)}), 500
