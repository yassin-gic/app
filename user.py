from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required, current_user

from models.digital_certificate import get_certificates_by_user_id

# Create a Blueprint for user routes
user_bp = Blueprint('user', __name__, url_prefix='/user')

@user_bp.route('/profile')
@login_required
def profile():
    """User profile page"""
    return render_template('user/profile.html')

@user_bp.route('/certificates')
@login_required
def certificates():
    """User's certificates page"""
    user_certs = get_certificates_by_user_id(current_user.id)
    return render_template('user/certificates.html', certificates=user_certs)