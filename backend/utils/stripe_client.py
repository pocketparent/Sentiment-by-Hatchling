import os
import logging
import stripe
from firebase_admin import firestore
from typing import Dict, Any, Optional, List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Stripe with the API key
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

def create_customer(user_id: str, email: str, name: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new Stripe customer for a user.
    
    Args:
        user_id: Firebase user ID
        email: User's email address
        name: User's name (optional)
        
    Returns:
        Dictionary with customer information
    """
    try:
        logger.info(f"Creating Stripe customer for user {user_id}")
        
        # Create customer in Stripe
        customer_data = {
            "email": email,
            "metadata": {"firebase_user_id": user_id}
        }
        
        if name:
            customer_data["name"] = name
            
        customer = stripe.Customer.create(**customer_data)
        
        # Update user record in Firestore
        db = firestore.client()
        db.collection('users').document(user_id).update({
            'stripe_customer_id': customer.id,
            'subscription_status': 'none'
        })
        
        logger.info(f"Stripe customer created: {customer.id}")
        
        return {
            "success": True,
            "customer_id": customer.id,
            "email": email
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating customer: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "code": e.code if hasattr(e, 'code') else 'unknown'
        }
    except Exception as e:
        logger.error(f"Error creating Stripe customer: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def create_subscription(customer_id: str, price_id: str, trial_days: int = 14) -> Dict[str, Any]:
    """
    Create a new subscription for a customer with a trial period.
    
    Args:
        customer_id: Stripe customer ID
        price_id: Stripe price ID for the subscription
        trial_days: Number of trial days (default: 14)
        
    Returns:
        Dictionary with subscription information
    """
    try:
        logger.info(f"Creating subscription for customer {customer_id}")
        
        # Create subscription with trial period
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            trial_period_days=trial_days,
            expand=["latest_invoice.payment_intent"]
        )
        
        # Get user by Stripe customer ID
        db = firestore.client()
        users_ref = db.collection('users')
        query = users_ref.where('stripe_customer_id', '==', customer_id).limit(1)
        user_docs = list(query.stream())
        
        if user_docs:
            user_id = user_docs[0].id
            # Update user record with subscription info
            users_ref.document(user_id).update({
                'subscription_id': subscription.id,
                'subscription_status': 'trialing',
                'trial_end': subscription.trial_end,
                'permissions': 'full'  # Grant full permissions during trial
            })
            
            logger.info(f"Subscription created: {subscription.id} for user {user_id}")
        else:
            logger.warning(f"No user found with Stripe customer ID: {customer_id}")
        
        return {
            "success": True,
            "subscription_id": subscription.id,
            "status": subscription.status,
            "trial_end": subscription.trial_end,
            "customer_id": customer_id
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating subscription: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "code": e.code if hasattr(e, 'code') else 'unknown'
        }
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def cancel_subscription(subscription_id: str) -> Dict[str, Any]:
    """
    Cancel a subscription immediately.
    
    Args:
        subscription_id: Stripe subscription ID
        
    Returns:
        Dictionary with cancellation information
    """
    try:
        logger.info(f"Cancelling subscription {subscription_id}")
        
        # Cancel subscription immediately
        subscription = stripe.Subscription.delete(subscription_id)
        
        # Get user by subscription ID
        db = firestore.client()
        users_ref = db.collection('users')
        query = users_ref.where('subscription_id', '==', subscription_id).limit(1)
        user_docs = list(query.stream())
        
        if user_docs:
            user_id = user_docs[0].id
            # Update user record with cancelled status
            users_ref.document(user_id).update({
                'subscription_status': 'cancelled',
                'permissions': 'read_only'  # Downgrade to read-only access
            })
            
            logger.info(f"Subscription cancelled: {subscription_id} for user {user_id}")
        else:
            logger.warning(f"No user found with subscription ID: {subscription_id}")
        
        return {
            "success": True,
            "subscription_id": subscription_id,
            "status": "cancelled"
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error cancelling subscription: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "code": e.code if hasattr(e, 'code') else 'unknown'
        }
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def get_subscription_status(subscription_id: str) -> Dict[str, Any]:
    """
    Get the current status of a subscription.
    
    Args:
        subscription_id: Stripe subscription ID
        
    Returns:
        Dictionary with subscription status information
    """
    try:
        logger.info(f"Getting status for subscription {subscription_id}")
        
        # Get subscription from Stripe
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        return {
            "success": True,
            "subscription_id": subscription_id,
            "status": subscription.status,
            "current_period_end": subscription.current_period_end,
            "trial_end": subscription.trial_end,
            "cancel_at_period_end": subscription.cancel_at_period_end
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting subscription: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "code": e.code if hasattr(e, 'code') else 'unknown'
        }
    except Exception as e:
        logger.error(f"Error getting subscription: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def create_checkout_session(customer_id: str, price_id: str, success_url: str, cancel_url: str) -> Dict[str, Any]:
    """
    Create a Stripe Checkout session for subscription payment.
    
    Args:
        customer_id: Stripe customer ID
        price_id: Stripe price ID for the subscription
        success_url: URL to redirect after successful payment
        cancel_url: URL to redirect after cancelled payment
        
    Returns:
        Dictionary with checkout session information
    """
    try:
        logger.info(f"Creating checkout session for customer {customer_id}")
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
        )
        
        return {
            "success": True,
            "session_id": session.id,
            "url": session.url
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "code": e.code if hasattr(e, 'code') else 'unknown'
        }
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def create_billing_portal_session(customer_id: str, return_url: str) -> Dict[str, Any]:
    """
    Create a Stripe Billing Portal session for subscription management.
    
    Args:
        customer_id: Stripe customer ID
        return_url: URL to return to after using the portal
        
    Returns:
        Dictionary with billing portal session information
    """
    try:
        logger.info(f"Creating billing portal session for customer {customer_id}")
        
        # Create billing portal session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        
        return {
            "success": True,
            "url": session.url
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating billing portal: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "code": e.code if hasattr(e, 'code') else 'unknown'
        }
    except Exception as e:
        logger.error(f"Error creating billing portal: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def get_subscription_prices() -> List[Dict[str, Any]]:
    """
    Get all active subscription prices.
    
    Returns:
        List of price information dictionaries
    """
    try:
        logger.info("Getting subscription prices")
        
        # Get all active prices
        prices = stripe.Price.list(
            active=True,
            type='recurring',
            expand=['data.product']
        )
        
        # Format price information
        price_list = []
        for price in prices.data:
            if price.product.active:
                price_info = {
                    "id": price.id,
                    "product_id": price.product.id,
                    "name": price.product.name,
                    "description": price.product.description,
                    "amount": price.unit_amount,
                    "currency": price.currency,
                    "interval": price.recurring.interval,
                    "interval_count": price.recurring.interval_count
                }
                price_list.append(price_info)
        
        return price_list
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting prices: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Error getting prices: {str(e)}")
        return []

def sync_subscription_status(user_id: str, customer_id: str) -> Tuple[bool, str]:
    """
    Sync subscription status from Stripe to Firestore.
    
    Args:
        user_id: Firebase user ID
        customer_id: Stripe customer ID
        
    Returns:
        Tuple of (success, status)
    """
    try:
        logger.info(f"Syncing subscription status for user {user_id}")
        
        # Get subscriptions for customer
        subscriptions = stripe.Subscription.list(
            customer=customer_id,
            status='all',
            limit=1
        )
        
        db = firestore.client()
        user_ref = db.collection('users').document(user_id)
        
        if not subscriptions.data:
            # No subscriptions found
            user_ref.update({
                'subscription_status': 'none',
                'subscription_id': None,
                'permissions': 'read_only'
            })
            return True, 'none'
        
        # Get the most recent subscription
        subscription = subscriptions.data[0]
        status = subscription.status
        
        # Update permissions based on status
        permissions = 'read_only'
        if status in ['trialing', 'active']:
            permissions = 'full'
        
        # Update user record
        user_ref.update({
            'subscription_status': status,
            'subscription_id': subscription.id,
            'permissions': permissions
        })
        
        logger.info(f"Subscription status synced: {status} for user {user_id}")
        return True, status
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error syncing subscription: {str(e)}")
        return False, str(e)
    except Exception as e:
        logger.error(f"Error syncing subscription: {str(e)}")
        return False, str(e)
