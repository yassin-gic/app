from app import app
from flask_login import LoginManager, current_user

from auth import auth_bp, User
from admin import admin_bp
from user import user_bp
from models.user import get_user_by_id

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Por favor inicia sesión para acceder a esta página.'
login_manager.login_message_category = 'warning'

# Setup user loader
@login_manager.user_loader
def load_user(user_id):
    user_dict = get_user_by_id(int(user_id))
    if not user_dict:
        return None
    return User(user_dict)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(user_bp)

# Import routes
from routes import *  # noqa: F401,E402

# Make current_user available to templates
@app.context_processor
def inject_user():
    return dict(current_user=current_user)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)