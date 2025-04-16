import os
import json
import uuid
from datetime import datetime

# Define the path for our JSON data file
DATA_DIR = "data"
CERTIFICATES_FILE = os.path.join(DATA_DIR, "certificates.json")
SIGNATURES_DIR = os.path.join(DATA_DIR, "signatures")

# Make sure our data directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SIGNATURES_DIR, exist_ok=True)

# Create empty certificates file if it doesn't exist
if not os.path.exists(CERTIFICATES_FILE):
    with open(CERTIFICATES_FILE, 'w') as f:
        json.dump([], f)

# Helper functions for certificate management
def load_certificates():
    """Load all certificates from the JSON file"""
    try:
        with open(CERTIFICATES_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        # If there's an error, return an empty list
        return []

def save_certificates(certificates):
    """Save certificates to the JSON file"""
    with open(CERTIFICATES_FILE, 'w') as f:
        json.dump(certificates, f, indent=2, default=str)

def get_certificate_by_id(cert_id):
    """Get a certificate by ID"""
    certificates = load_certificates()
    for cert in certificates:
        if cert['id'] == cert_id:
            return cert
    return None

def get_certificates_by_user_id(user_id):
    """Get all certificates for a user"""
    certificates = load_certificates()
    return [cert for cert in certificates if cert['user_id'] == user_id]

def create_certificate(user_id, cert_name, cert_data, validity_period=365):
    """Create a new digital certificate
    
    Args:
        user_id: ID of the user who owns the certificate
        cert_name: Friendly name for the certificate
        cert_data: Base64 encoded certificate data (public key)
        validity_period: Validity in days (default 1 year)
        
    Returns:
        Tuple (certificate, error)
    """
    certificates = load_certificates()
    
    # Generate a new certificate ID
    cert_id = str(uuid.uuid4())
    
    # Create timestamps
    created_at = datetime.utcnow()
    expires_at = created_at.replace(year=created_at.year + 1)  # Default to 1 year validity
    
    # Create the certificate entry
    new_certificate = {
        'id': cert_id,
        'user_id': user_id,
        'name': cert_name,
        'certificate_data': cert_data,
        'created_at': created_at.isoformat(),
        'expires_at': expires_at.isoformat(),
        'status': 'active'  # active, revoked
    }
    
    # Add to certificates list and save
    certificates.append(new_certificate)
    save_certificates(certificates)
    
    return new_certificate, None

def revoke_certificate(cert_id):
    """Revoke a certificate"""
    certificates = load_certificates()
    for cert in certificates:
        if cert['id'] == cert_id:
            cert['status'] = 'revoked'
            cert['revoked_at'] = datetime.utcnow().isoformat()
            save_certificates(certificates)
            return cert, None
    
    return None, "Certificate not found"

def create_digital_signature(user_id, cert_id, document_id, signature_data):
    """Create a digital signature for a document
    
    Args:
        user_id: ID of the signing user
        cert_id: ID of the certificate used for signing
        document_id: ID of the document being signed
        signature_data: The digital signature data
        
    Returns:
        Tuple (signature, error)
    """
    # Check if certificate exists and is active
    cert = get_certificate_by_id(cert_id)
    if not cert:
        return None, "Certificate not found"
    
    if cert['status'] != 'active':
        return None, "Certificate is not active"
    
    if cert['user_id'] != user_id:
        return None, "Certificate does not belong to this user"
    
    # Generate a unique signature ID
    signature_id = str(uuid.uuid4())
    
    # Create signature entry
    signature = {
        'id': signature_id,
        'user_id': user_id,
        'certificate_id': cert_id,
        'document_id': document_id,
        'signature_data': signature_data,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # Save signature to a file
    signature_path = os.path.join(SIGNATURES_DIR, f"{signature_id}.json")
    with open(signature_path, 'w') as f:
        json.dump(signature, f, indent=2, default=str)
    
    return signature, None

def verify_signature(signature_id):
    """Verify a digital signature
    
    Args:
        signature_id: ID of the signature to verify
        
    Returns:
        Tuple (is_valid, error)
    """
    # Read signature file
    signature_path = os.path.join(SIGNATURES_DIR, f"{signature_id}.json")
    try:
        with open(signature_path, 'r') as f:
            signature = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return False, "Signature not found"
    
    # Get the certificate
    cert = get_certificate_by_id(signature['certificate_id'])
    if not cert:
        return False, "Certificate not found"
    
    # Check if certificate was active at signing time
    signature_time = datetime.fromisoformat(signature['timestamp'])
    cert_created = datetime.fromisoformat(cert['created_at'])
    cert_expires = datetime.fromisoformat(cert['expires_at'])
    
    if signature_time < cert_created or signature_time > cert_expires:
        return False, "Signature created outside of certificate validity period"
    
    if cert.get('revoked_at'):
        cert_revoked = datetime.fromisoformat(cert['revoked_at'])
        if signature_time > cert_revoked:
            return False, "Certificate was revoked before signature creation"
    
    # In a real system, we would cryptographically verify the signature here
    # For this demo, we'll just return true if everything checks out
    return True, None