from flask import Blueprint, request, jsonify
import logging
import traceback
from firebase_admin import firestore
from utils.stripe_client import (
    create_customer, 
    create_subscription, 
    cancel_subscription, 
    get_subscription_status,
    create_checkout_session,
    create_billing_portal_session,
    get_subscription_prices,
    sync_subscription_status
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

subscription_bp = Blueprint("subscription", __name__)
db = firestore.client()

@subscription_bp.route("/create-customer", methods=["POST"])
def handle_create_customer():
    """
    Create a new Stripe customer for a user.
    
    Request body:
    - user_id: Firebase user ID
    - email: User's email address
    - name: User's name (optional)
    """
    try:
        logger.info("📥 POST /api/subscription/create-customer hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        user_id = data.get("user_id")
        email = data.get("email")
        name = data.get("name")
        
        if not user_id or not email:
            return jsonify({"error": "Missing required fields: user_id or email"}), 400
            
        # Create customer
        result = create_customer(user_id, email, name)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"❌ Error in POST /api/subscription/create-customer: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@subscription_bp.route("/create-subscription", methods=["POST"])
def handle_create_subscription():
    """
    Create a new subscription for a customer with a trial period.
    
    Request body:
    - customer_id: Stripe customer ID
    - price_id: Stripe price ID for the subscription
    - trial_days: Number of trial days (optional, default: 14)
    """
    try:
        logger.info("📥 POST /api/subscription/create-subscription hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        customer_id = data.get("customer_id")
        price_id = data.get("price_id")
        trial_days = data.get("trial_days", 14)
        
        if not customer_id or not price_id:
            return jsonify({"error": "Missing required fields: customer_id or price_id"}), 400
            
        # Create subscription
        result = create_subscription(customer_id, price_id, trial_days)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"❌ Error in POST /api/subscription/create-subscription: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@subscription_bp.route("/cancel-subscription", methods=["POST"])
def handle_cancel_subscription():
    """
    Cancel a subscription immediately.
    
    Request body:
    - subscription_id: Stripe subscription ID
    """
    try:
        logger.info("📥 POST /api/subscription/cancel-subscription hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        subscription_id = data.get("subscription_id")
        
        if not subscription_id:
            return jsonify({"error": "Missing required field: subscription_id"}), 400
            
        # Cancel subscription
        result = cancel_subscription(subscription_id)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"❌ Error in POST /api/subscription/cancel-subscription: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@subscription_bp.route("/status/<subscription_id>", methods=["GET"])
def handle_get_status(subscription_id):
    """
    Get the current status of a subscription.
    
    Path parameter:
    - subscription_id: Stripe subscription ID
    """
    try:
        logger.info(f"📥 GET /api/subscription/status/{subscription_id} hit!")
        
        if not subscription_id:
            return jsonify({"error": "Missing subscription ID"}), 400
            
        # Get subscription status
        result = get_subscription_status(subscription_id)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"❌ Error in GET /api/subscription/status/{subscription_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@subscription_bp.route("/create-checkout", methods=["POST"])
def handle_create_checkout():
    """
    Create a Stripe Checkout session for subscription payment.
    
    Request body:
    - customer_id: Stripe customer ID
    - price_id: Stripe price ID for the subscription
    - success_url: URL to redirect after successful payment
    - cancel_url: URL to redirect after cancelled payment
    """
    try:
        logger.info("📥 POST /api/subscription/create-checkout hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        customer_id = data.get("customer_id")
        price_id = data.get("price_id")
        success_url = data.get("success_url")
        cancel_url = data.get("cancel_url")
        
        if not customer_id or not price_id or not success_url or not cancel_url:
            return jsonify({"error": "Missing required fields"}), 400
            
        # Create checkout session
        result = create_checkout_session(customer_id, price_id, success_url, cancel_url)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"❌ Error in POST /api/subscription/create-checkout: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@subscription_bp.route("/create-portal", methods=["POST"])
def handle_create_portal():
    """
    Create a Stripe Billing Portal session for subscription management.
    
    Request body:
    - customer_id: Stripe customer ID
    - return_url: URL to return to after using the portal
    """
    try:
        logger.info("📥 POST /api/subscription/create-portal hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        customer_id = data.get("customer_id")
        return_url = data.get("return_url")
        
        if not customer_id or not return_url:
            return jsonify({"error": "Missing required fields: customer_id or return_url"}), 400
            
        # Create billing portal session
        result = create_billing_portal_session(customer_id, return_url)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"❌ Error in POST /api/subscription/create-portal: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@subscription_bp.route("/prices", methods=["GET"])
def handle_get_prices():
    """
    Get all active subscription prices.
    """
    try:
        logger.info("📥 GET /api/subscription/prices hit!")
        
        # Get subscription prices
        prices = get_subscription_prices()
        
        return jsonify({"prices": prices}), 200
            
    except Exception as e:
        logger.error(f"❌ Error in GET /api/subscription/prices: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@subscription_bp.route("/sync-status", methods=["POST"])
def handle_sync_status():
    """
    Sync subscription status from Stripe to Firestore.
    
    Request body:
    - user_id: Firebase user ID
    - customer_id: Stripe customer ID
    """
    try:
        logger.info("📥 POST /api/subscription/sync-status hit!")
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Missing request data"}), 400
            
        user_id = data.get("user_id")
        customer_id = data.get("customer_id")
        
        if not user_id or not customer_id:
            return jsonify({"error": "Missing required fields: user_id or customer_id"}), 400
            
        # Sync subscription status
        success, status = sync_subscription_status(user_id, customer_id)
        
        if success:
            return jsonify({"success": True, "status": status}), 200
        else:
            return jsonify({"success": False, "error": status}), 400
            
    except Exception as e:
        logger.error(f"❌ Error in POST /api/subscription/sync-status: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
