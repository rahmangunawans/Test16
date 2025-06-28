import os
import stripe
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_required, current_user
from models import User, Subscription
from app import db
from datetime import datetime, timedelta
import logging

subscription_bp = Blueprint('subscription', __name__)

# Initialize Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_example_key')

# Subscription plans
SUBSCRIPTION_PLANS = {
    'vip_monthly': {
        'name': '1 Month VIP',
        'price': 3.00,
        'duration_days': 30,
        'stripe_price_id': os.environ.get('STRIPE_MONTHLY_PRICE_ID', 'price_monthly_example')
    },
    'vip_3month': {
        'name': '3 Month VIP',
        'price': 8.00,
        'duration_days': 90,
        'stripe_price_id': os.environ.get('STRIPE_3MONTH_PRICE_ID', 'price_3month_example')
    },
    'vip_yearly': {
        'name': '1 Year VIP',
        'price': 28.00,
        'duration_days': 365,
        'stripe_price_id': os.environ.get('STRIPE_YEARLY_PRICE_ID', 'price_yearly_example')
    }
}

@subscription_bp.route('/')
@login_required
def subscription_page():
    return render_template('subscription.html', plans=SUBSCRIPTION_PLANS, current_user=current_user)

@subscription_bp.route('/create-checkout-session', methods=['POST'])
@login_required
def create_checkout_session():
    plan_type = request.form.get('plan_type')
    
    if plan_type not in SUBSCRIPTION_PLANS:
        flash('Invalid subscription plan', 'error')
        return redirect(url_for('subscription.subscription_page'))
    
    plan = SUBSCRIPTION_PLANS[plan_type]
    
    try:
        # Get domain for redirect URLs
        YOUR_DOMAIN = request.host_url.rstrip('/')
        
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f'AniFlix {plan["name"]}',
                            'description': 'Premium anime streaming access'
                        },
                        'unit_amount': int(plan['price'] * 100),  # Amount in cents
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=YOUR_DOMAIN + '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=YOUR_DOMAIN + '/subscription/cancel',
            metadata={
                'user_id': current_user.id,
                'plan_type': plan_type
            }
        )
        
        # Store session info
        subscription_record = Subscription(
            user_id=current_user.id,
            stripe_session_id=checkout_session.id,
            subscription_type=plan_type,
            amount=plan['price'],
            status='pending'
        )
        db.session.add(subscription_record)
        db.session.commit()
        
        return redirect(checkout_session.url, code=303)
        
    except Exception as e:
        logging.error(f"Stripe checkout error: {e}")
        flash('Payment processing error. Please try again.', 'error')
        return redirect(url_for('subscription.subscription_page'))

@subscription_bp.route('/success')
@login_required
def subscription_success():
    session_id = request.args.get('session_id')
    
    if not session_id:
        flash('Invalid payment session', 'error')
        return redirect(url_for('subscription.subscription_page'))
    
    try:
        # Retrieve the session from Stripe
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        if checkout_session.payment_status == 'paid':
            # Update subscription in database
            subscription_record = Subscription.query.filter_by(stripe_session_id=session_id).first()
            
            if subscription_record:
                subscription_record.status = 'completed'
                
                # Update user subscription
                plan_type = subscription_record.subscription_type
                plan = SUBSCRIPTION_PLANS[plan_type]
                
                current_user.subscription_type = plan_type
                current_user.subscription_expires = datetime.utcnow() + timedelta(days=plan['duration_days'])
                current_user.max_devices = 2  # VIP users get 2 devices
                
                db.session.commit()
                
                flash(f'Subscription activated successfully! Welcome to AniFlix VIP!', 'success')
                logging.info(f"User {current_user.email} upgraded to {plan_type}")
            else:
                flash('Subscription record not found', 'error')
        else:
            flash('Payment not completed', 'error')
            
    except Exception as e:
        logging.error(f"Subscription success error: {e}")
        flash('Error processing subscription. Please contact support.', 'error')
    
    return redirect(url_for('dashboard'))

@subscription_bp.route('/cancel')
@login_required
def subscription_cancel():
    flash('Payment cancelled. You can try again anytime!', 'info')
    return redirect(url_for('subscription.subscription_page'))
