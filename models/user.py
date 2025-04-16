import os
import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# Define the path for our JSON data file
DATA_DIR = "data"
USERS_FILE = os.path.join(DATA_DIR, "users.json")

# Make sure our data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Create empty users file if it doesn't exist
if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'w') as f:
        json.dump([], f)

# Helper functions for user management
def load_users():
    """Load all users from the JSON file"""
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        # If there's an error, return an empty list
        return []

def save_users(users):
    """Save users to the JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2, default=str)

def get_user_by_id(user_id):
    """Get a user by their ID"""
    users = load_users()
    for user in users:
        if user['id'] == user_id:
            return user
    return None

def get_user_by_email(email):
    """Get a user by their email"""
    users = load_users()
    for user in users:
        if user['email'] == email:
            return user
    return None

def get_user_by_dni(dni):
    """Get a user by their DNI"""
    users = load_users()
    for user in users:
        if user['dni'] == dni:
            return user
    return None

def create_user(dni, email, full_name, password, is_admin=False):
    """Create a new user with pending status"""
    users = load_users()
    
    # Check if user already exists
    if get_user_by_email(email):
        return None, "Email already registered"
    
    if get_user_by_dni(dni):
        return None, "DNI already registered"
    
    # Generate a new user ID
    user_id = 1
    if users:
        user_id = max(user['id'] for user in users) + 1
    
    # Create the user
    new_user = {
        'id': user_id,
        'dni': dni,
        'email': email,
        'full_name': full_name,
        'password_hash': generate_password_hash(password),
        'is_admin': is_admin,
        'status': 'pending',  # pending, approved, rejected
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }
    
    # Add to users list and save
    users.append(new_user)
    save_users(users)
    
    return new_user, None

def authenticate_user(email, password):
    """Authenticate a user by email and password"""
    user = get_user_by_email(email)
    if not user:
        return None, "User not found"
    
    if user['status'] != 'approved':
        return None, "Account not approved"
    
    if not check_password_hash(user['password_hash'], password):
        return None, "Invalid password"
    
    return user, None

def update_user_status(user_id, status):
    """Update a user's status (approve or reject)"""
    if status not in ['pending', 'approved', 'rejected']:
        return None, "Invalid status"
    
    users = load_users()
    for user in users:
        if user['id'] == user_id:
            user['status'] = status
            user['updated_at'] = datetime.utcnow().isoformat()
            save_users(users)
            return user, None
    
    return None, "User not found"

def get_pending_users():
    """Get all users with pending status"""
    users = load_users()
    return [user for user in users if user['status'] == 'pending']

def get_all_users():
    """Get all users"""
    return load_users()

# Create admin user if none exists
def ensure_admin_exists():
    """Ensure at least one admin user exists"""
    users = load_users()
    admin_exists = any(user.get('is_admin', False) for user in users)
    
    if not admin_exists:
        # Create admin user
        create_user(
            dni="admin123",
            email="admin@example.com",
            full_name="Administrator",
            password="admin123",
            is_admin=True
        )
        
        # Auto-approve the admin
        users = load_users()
        for user in users:
            if user['email'] == "admin@example.com":
                user['status'] = 'approved'
                save_users(users)
                break

# Ensure admin exists when this module is imported
ensure_admin_exists()