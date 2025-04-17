from flask import Blueprint, request, jsonify
import stripe
import os
import logging
from utils import firebase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Stripe with the API key
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')

# Create Blueprint
stripe_bp = Blueprint('stripe', __name__)

@stripe_bp.route('/webhook', methods=['POST'])
def webhook():
    """
    Handle Stripe webhook events for subscription management.
    
    Events handled:
    - customer.subscription.trial_will_end: Sent 3 days before trial ends
    - invoice.payment_succeeded: Sent when payment is successful
    - invoice.payment_failed: Sent when payment fails
    """
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    # Verify webhook signature
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid Stripe payload: {e}")
        return jsonify({"error": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid Stripe signature: {e}")
        return jsonify({"error": "Invalid signature"}), 400
    
    # Get event data
    event_type = event['type']
    data = event['data']['object']
    
    logger.info(f"Processing Stripe event: {event_type}")
    
    # Handle specific event types
    if event_type == 'customer.subscription.trial_will_end':
        return handle_trial_ending(data)
    elif event_type == 'invoice.payment_succeeded':
        return handle_payment_succeeded(data)
    elif event_type == 'invoice.payment_failed':
        return handle_payment_failed(data)
    else:
        # Unhandled event type
        logger.info(f"Unhandled event type: {event_type}")
        return jsonify({"status": "ignored", "message": "Event type not handled"}), 200

def handle_trial_ending(data):
    """Handle trial ending event by notifying the user."""
    try:
        customer_id = data.get('customer')
        subscription_id = data.get('id')
        
        # Get user by Stripe customer ID
        db = firebase.db
        users_ref = db.collection('users')
        query = users_ref.where('stripe_customer_id', '==', customer_id).limit(1)
        user_docs = query.get()
        
        if not user_docs:
            logger.error(f"No user found with Stripe customer ID: {customer_id}")
            return jsonify({"error": "User not found"}), 404
        
        user_doc = user_docs[0]
        user_id = user_doc.id
        user_data = user_doc.to_dict()
        
        # Update user record with trial ending status
        users_ref.document(user_id).update({
            'subscription_status': 'trial_ending',
            'subscription_id': subscription_id
        })
        
        # Log the event
        logger.info(f"Trial ending for user {user_id} with subscription {subscription_id}")
        
        # TODO: Send notification to user (could be implemented with Twilio SMS)
        
        return jsonify({
            "status": "success",
            "message": "Trial ending event processed",
            "user_id": user_id
        }), 200
    
    except Exception as e:
        logger.error(f"Error handling trial ending: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

def handle_payment_succeeded(data):
    """Handle successful payment by updating user subscription status."""
    try:
        customer_id = data.get('customer')
        subscription_id = data.get('subscription')
        
        if not subscription_id:
            logger.info(f"Non-subscription invoice for customer {customer_id}")
            return jsonify({"status": "ignored", "message": "Non-subscription invoice"}), 200
        
        # Get user by Stripe customer ID
        db = firebase.db
        users_ref = db.collection('users')
        query = users_ref.where('stripe_customer_id', '==', customer_id).limit(1)
        user_docs = query.get()
        
        if not user_docs:
            logger.error(f"No user found with Stripe customer ID: {customer_id}")
            return jsonify({"error": "User not found"}), 404
        
        user_doc = user_docs[0]
        user_id = user_doc.id
        
        # Update user record with active status
        users_ref.document(user_id).update({
            'subscription_status': 'active',
            'subscription_id': subscription_id
        })
        
        # Log the event
        logger.info(f"Payment succeeded for user {user_id} with subscription {subscription_id}")
        
        return jsonify({
            "status": "success",
            "message": "Payment succeeded event processed",
            "user_id": user_id
        }), 200
    
    except Exception as e:
        logger.error(f"Error handling payment succeeded: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

def handle_payment_failed(data):
    """Handle failed payment by updating user subscription status."""
    try:
        customer_id = data.get('customer')
        subscription_id = data.get('subscription')
        attempt_count = data.get('attempt_count', 1)
        
        if not subscription_id:
            logger.info(f"Non-subscription invoice for customer {customer_id}")
            return jsonify({"status": "ignored", "message": "Non-subscription invoice"}), 200
        
        # Get user by Stripe customer ID
        db = firebase.db
        users_ref = db.collection('users')
        query = users_ref.where('stripe_customer_id', '==', customer_id).limit(1)
        user_docs = query.get()
        
        if not user_docs:
            logger.error(f"No user found with Stripe customer ID: {customer_id}")
            return jsonify({"error": "User not found"}), 404
        
        user_doc = user_docs[0]
        user_id = user_doc.id
        
        # Update user record with payment_failed status
        status = 'payment_failed'
        if attempt_count >= 3:
            status = 'payment_failed_final'
            # After final attempt, downgrade to read-only
            users_ref.document(user_id).update({
                'subscription_status': status,
                'subscription_id': subscription_id,
                'permissions': 'read_only'  # Downgrade to read-only access
            })
        else:
            users_ref.document(user_id).update({
                'subscription_status': status,
                'subscription_id': subscription_id
            })
        
        # Log the event
        logger.info(f"Payment failed for user {user_id} with subscription {subscription_id}, attempt {attempt_count}")
        
        # TODO: Send notification to user about payment failure (could be implemented with Twilio SMS)
        
        return jsonify({
            "status": "success",
            "message": "Payment failed event processed",
            "user_id": user_id,
            "attempt": attempt_count
        }), 200
    
    except Exception as e:
        logger.error(f"Error handling payment failed: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
