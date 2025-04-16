from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_required, current_user

from auth import admin_required
from models.user import get_all_users, get_pending_users, update_user_status, get_user_by_id, create_user as create_user_model
from models.digital_certificate import (
    load_certificates, create_certificate as create_certificate_model, 
    revoke_certificate, get_certificate_by_id
)

# Create a Blueprint for admin routes
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    """Admin dashboard"""
    # Get users and certificates
    all_users = get_all_users()
    pending_users = get_pending_users()
    certificates = load_certificates()
    
    # Get approved users for certificate creation
    approved_users = [user for user in all_users if user['status'] == 'approved']
    
    # Enrich certificates with user names
    for cert in certificates:
        user = get_user_by_id(cert['user_id'])
        cert['user_name'] = user['full_name'] if user else "Usuario desconocido"
    
    return render_template(
        'admin/dashboard.html',
        all_users=all_users,
        pending_users=pending_users,
        certificates=certificates,
        approved_users=approved_users,
        total_users=len(all_users),
        total_certificates=len(certificates)
    )

@admin_bp.route('/users/<int:user_id>')
@login_required
@admin_required
def get_user(user_id):
    """Get user details"""
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    return jsonify(user)

@admin_bp.route('/users/<int:user_id>/approve', methods=['POST'])
@login_required
@admin_required
def approve_user(user_id):
    """Approve a user"""
    user, error = update_user_status(user_id, 'approved')
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify({'message': 'Usuario aprobado correctamente', 'user': user})

@admin_bp.route('/users/<int:user_id>/reject', methods=['POST'])
@login_required
@admin_required
def reject_user(user_id):
    """Reject a user"""
    user, error = update_user_status(user_id, 'rejected')
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify({'message': 'Usuario rechazado correctamente', 'user': user})

@admin_bp.route('/users/create', methods=['POST'])
@login_required
@admin_required
def create_user():
    """Create a new user"""
    dni = request.form['dni']
    email = request.form['email']
    full_name = request.form['full_name']
    password = request.form['password']
    is_admin = 'is_admin' in request.form
    
    user, error = create_user_model(dni, email, full_name, password, is_admin)
    
    if error:
        flash(f'Error al crear el usuario: {error}', 'danger')
        return redirect(url_for('admin.dashboard'))
    
    # Auto-approve user
    update_user_status(user['id'], 'approved')
    
    flash('Usuario creado correctamente', 'success')
    return redirect(url_for('admin.dashboard'))

@admin_bp.route('/users/<int:user_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_user(user_id):
    """Delete a user"""
    # Load all users
    users = get_all_users()
    
    # Remove the user with the given ID
    updated_users = [user for user in users if user['id'] != user_id]
    
    # Save the updated list
    from models.user import save_users
    save_users(updated_users)
    
    return jsonify({'message': 'Usuario eliminado correctamente'})

@admin_bp.route('/certificates/create', methods=['POST'])
@login_required
@admin_required
def create_certificate():
    """Create a new certificate"""
    user_id = int(request.form['user_id'])
    cert_name = request.form['cert_name']
    cert_data = request.form['cert_data']
    validity_period = int(request.form['validity_period'])
    
    certificate, error = create_certificate_model(user_id, cert_name, cert_data, validity_period)
    
    if error:
        flash(f'Error al crear el certificado: {error}', 'danger')
        return redirect(url_for('admin.dashboard'))
    
    flash('Certificado creado correctamente', 'success')
    return redirect(url_for('admin.dashboard'))

@admin_bp.route('/certificates/<string:cert_id>/revoke', methods=['POST'])
@login_required
@admin_required
def revoke_cert(cert_id):
    """Revoke a certificate"""
    certificate, error = revoke_certificate(cert_id)
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify({'message': 'Certificado revocado correctamente', 'certificate': certificate})