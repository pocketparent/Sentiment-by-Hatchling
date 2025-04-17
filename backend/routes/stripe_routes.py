from flask import Blueprint, request, jsonify
import logging
import traceback
from datetime import datetime
from firebase_admin import firestore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firestore
db = firestore.client()

# Create blueprint
stripe_routes_bp = Blueprint("stripe_routes", __name__)

@stripe_routes_bp.route("/setup", methods=["POST"])
def setup_subscription():
    """
    Set up a new subscription for a user.
    
    Expected POST parameters:
    - user_id: ID of the user
    - plan_type: 'monthly' or 'annual'
    - payment_method_id: Stripe payment method ID
    """
    try:
        logger.info("💳 Subscription setup endpoint hit")
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        user_id = data.get("user_id")
        plan_type = data.get("plan_type")
        payment_method_id = data.get("payment_method_id")
        
        # Validate required fields
        if not user_id or not plan_type or not payment_method_id:
            logger.warning("Missing required fields for subscription setup")
            return jsonify({
                "error": "Missing required fields",
                "required": ["user_id", "plan_type", "payment_method_id"]
            }), 400
            
        # Validate plan type
        if plan_type not in ["monthly", "annual"]:
            logger.warning(f"Invalid plan type: {plan_type}")
            return jsonify({"error": "Invalid plan type. Must be 'monthly' or 'annual'"}), 400
            
        # Check if user exists
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            logger.warning(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
            
        # TODO: Implement actual Stripe subscription creation
        # For now, simulate subscription creation
        
        # Get price ID based on plan type
        price_id = "price_monthly" if plan_type == "monthly" else "price_annual"
        
        # Calculate trial end date (14 days from now)
        trial_end = datetime.now().timestamp() + (14 * 24 * 60 * 60)
        
        # Update user with subscription info
        subscription_data = {
            "subscription_active": True,
            "subscription_plan": plan_type,
            "subscription_status": "trialing",
            "subscription_trial_end": trial_end,
            "subscription_created": firestore.SERVER_TIMESTAMP,
            "payment_method_id": payment_method_id
        }
        
        user_ref.update(subscription_data)
        
        logger.info(f"✅ Subscription created for user {user_id} with plan {plan_type}")
        
        return jsonify({
            "success": True,
            "subscription": {
                "status": "trialing",
                "plan": plan_type,
                "trial_end": trial_end
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in subscription setup: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@stripe_routes_bp.route("/cancel", methods=["POST"])
def cancel_subscription():
    """
    Cancel a user's subscription.
    
    Expected POST parameters:
    - user_id: ID of the user
    """
    try:
        logger.info("🛑 Subscription cancellation endpoint hit")
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        user_id = data.get("user_id")
        
        # Validate required fields
        if not user_id:
            logger.warning("Missing user_id for subscription cancellation")
            return jsonify({"error": "Missing user_id"}), 400
            
        # Check if user exists
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            logger.warning(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
            
        user_data = user_doc.to_dict()
        
        # Check if user has an active subscription
        if not user_data.get("subscription_active", False):
            logger.warning(f"User {user_id} does not have an active subscription")
            return jsonify({"error": "No active subscription found"}), 400
            
        # TODO: Implement actual Stripe subscription cancellation
        # For now, simulate subscription cancellation
        
        # Update user with cancelled subscription info
        cancellation_data = {
            "subscription_active": False,
            "subscription_status": "cancelled",
            "subscription_cancelled_at": firestore.SERVER_TIMESTAMP
        }
        
        user_ref.update(cancellation_data)
        
        logger.info(f"✅ Subscription cancelled for user {user_id}")
        
        return jsonify({
            "success": True,
            "message": "Subscription cancelled successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in subscription cancellation: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@stripe_routes_bp.route("/status", methods=["GET"])
def subscription_status():
    """
    Get a user's subscription status.
    
    Query parameters:
    - user_id: ID of the user
    """
    try:
        logger.info("ℹ️ Subscription status endpoint hit")
        user_id = request.args.get("user_id")
        
        # Validate required fields
        if not user_id:
            logger.warning("Missing user_id for subscription status")
            return jsonify({"error": "Missing user_id parameter"}), 400
            
        # Check if user exists
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            logger.warning(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
            
        user_data = user_doc.to_dict()
        
        # Extract subscription data
        subscription_data = {
            "active": user_data.get("subscription_active", False),
            "status": user_data.get("subscription_status", "inactive"),
            "plan": user_data.get("subscription_plan", None),
            "trial_end": user_data.get("subscription_trial_end", None),
            "created": user_data.get("subscription_created", None),
            "cancelled_at": user_data.get("subscription_cancelled_at", None)
        }
        
        logger.info(f"✅ Subscription status retrieved for user {user_id}")
        
        return jsonify({
            "success": True,
            "subscription": subscription_data
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in subscription status: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@stripe_routes_bp.route("/update", methods=["POST"])
def update_subscription():
    """
    Update a user's subscription plan.
    
    Expected POST parameters:
    - user_id: ID of the user
    - plan_type: 'monthly' or 'annual'
    """
    try:
        logger.info("🔄 Subscription update endpoint hit")
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        user_id = data.get("user_id")
        plan_type = data.get("plan_type")
        
        # Validate required fields
        if not user_id or not plan_type:
            logger.warning("Missing required fields for subscription update")
            return jsonify({
                "error": "Missing required fields",
                "required": ["user_id", "plan_type"]
            }), 400
            
        # Validate plan type
        if plan_type not in ["monthly", "annual"]:
            logger.warning(f"Invalid plan type: {plan_type}")
            return jsonify({"error": "Invalid plan type. Must be 'monthly' or 'annual'"}), 400
            
        # Check if user exists
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            logger.warning(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
            
        user_data = user_doc.to_dict()
        
        # Check if user has an active subscription
        if not user_data.get("subscription_active", False):
            logger.warning(f"User {user_id} does not have an active subscription")
            return jsonify({"error": "No active subscription found"}), 400
            
        # TODO: Implement actual Stripe subscription update
        # For now, simulate subscription update
        
        # Update user with new plan info
        update_data = {
            "subscription_plan": plan_type,
            "subscription_updated_at": firestore.SERVER_TIMESTAMP
        }
        
        user_ref.update(update_data)
        
        logger.info(f"✅ Subscription updated for user {user_id} to plan {plan_type}")
        
        return jsonify({
            "success": True,
            "message": "Subscription updated successfully",
            "subscription": {
                "plan": plan_type,
                "status": user_data.get("subscription_status")
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error in subscription update: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
