from flask import Blueprint, render_template, redirect, url_for, request, flash, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import functools

from models.user import authenticate_user, create_user, get_user_by_id, get_user_by_email

# Create a Blueprint for authentication routes
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

def create_user_session(user):
    """Create a session for the user"""
    session['user_id'] = user['id']
    session['user_email'] = user['email']
    session['user_full_name'] = user['full_name']
    session['user_is_admin'] = user['is_admin']

def load_user_from_session():
    """Load user from session"""
    user_id = session.get('user_id')
    if user_id:
        return get_user_by_id(user_id)
    return None

class User:
    """User class for Flask-Login"""
    def __init__(self, user_dict):
        self.id = user_dict['id']
        self.email = user_dict['email']
        self.full_name = user_dict['full_name']
        self.dni = user_dict['dni']
        self.is_admin = user_dict['is_admin']
        self.status = user_dict['status']
        self.created_at = user_dict['created_at']
        self.updated_at = user_dict['updated_at']
    
    @property
    def is_authenticated(self):
        return True
    
    @property
    def is_active(self):
        return self.status == 'approved'
    
    @property
    def is_anonymous(self):
        return False
    
    def get_id(self):
        return str(self.id)

def admin_required(f):
    """Decorator to require admin access"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            flash('Acceso denegado. Necesitas ser administrador para acceder a esta página.', 'danger')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login route"""
    # If user is already logged in, redirect to home
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    error = None
    
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
        user, error = authenticate_user(email, password)
        
        if user and not error:
            # Create a User object for Flask-Login
            user_obj = User(user)
            login_user(user_obj)
            
            # Create user session
            create_user_session(user)
            
            # Redirect to requested page or home
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for('index'))
    
    return render_template('auth/login.html', error=error)


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Register route"""
    # If user is already logged in, redirect to home
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    error = None
    success = False
    
    if request.method == 'POST':
        dni = request.form['dni']
        email = request.form['email']
        full_name = request.form['full_name']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        # Validate password match
        if password != confirm_password:
            error = "Las contraseñas no coinciden"
        else:
            # Create user
            user, error = create_user(dni, email, full_name, password)
            
            if user and not error:
                success = True
                flash('Tu solicitud de registro ha sido enviada. Un administrador revisará tu solicitud.', 'success')
    
    return render_template('auth/register.html', error=error, success=success)


@auth_bp.route('/logout')
@login_required
def logout():
    """Logout route"""
    logout_user()
    # Clear session
    session.clear()
    flash('Has cerrado sesión correctamente', 'success')
    return redirect(url_for('index'))