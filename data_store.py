import os
import json
import time
from datetime import datetime

# Define the paths for our JSON data files
DATA_DIR = "data"
JOBS_FILE = os.path.join(DATA_DIR, "jobs.json")
SIGNATURES_FILE = os.path.join(DATA_DIR, "signatures.json")
UPLOADS_FILE = os.path.join(DATA_DIR, "uploads.json")

# Make sure our data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Create empty data files if they don't exist
def init_data_files():
    # Jobs data structure
    if not os.path.exists(JOBS_FILE):
        with open(JOBS_FILE, 'w') as f:
            json.dump([], f)
    
    # Signatures data structure
    if not os.path.exists(SIGNATURES_FILE):
        with open(SIGNATURES_FILE, 'w') as f:
            json.dump([], f)
    
    # Uploads data structure
    if not os.path.exists(UPLOADS_FILE):
        with open(UPLOADS_FILE, 'w') as f:
            json.dump([], f)

# Initialize data files
init_data_files()

# Helper function to load data from a JSON file
def load_data(file_path):
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        # If there's an error, return an empty list
        return []

# Helper function to save data to a JSON file
def save_data(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2, default=str)

# Job functions
def get_all_jobs():
    return load_data(JOBS_FILE)

def get_job_by_id(job_id):
    jobs = get_all_jobs()
    for job in jobs:
        if job['id'] == job_id:
            return job
    return None

def create_job(title, description=None):
    jobs = get_all_jobs()
    
    # Generate a new job ID
    job_id = 1
    if jobs:
        job_id = max(job['id'] for job in jobs) + 1
    
    # Get current timestamp
    timestamp = datetime.utcnow().isoformat()
    
    # Create new job
    new_job = {
        'id': job_id,
        'title': title,
        'description': description or '',
        'status': 'pending',
        'created_at': timestamp,
        'updated_at': timestamp
    }
    
    # Add to jobs list and save
    jobs.append(new_job)
    save_data(JOBS_FILE, jobs)
    
    return new_job

def update_job_status(job_id, status):
    jobs = get_all_jobs()
    for job in jobs:
        if job['id'] == job_id:
            job['status'] = status
            job['updated_at'] = datetime.utcnow().isoformat()
            save_data(JOBS_FILE, jobs)
            return job
    return None

# Signature functions
def get_all_signatures():
    return load_data(SIGNATURES_FILE)

def get_signatures_by_job_id(job_id):
    signatures = get_all_signatures()
    return [sig for sig in signatures if sig['job_id'] == job_id]

def get_signature_by_id(signature_id):
    signatures = get_all_signatures()
    for signature in signatures:
        if signature['id'] == signature_id:
            return signature
    return None

def create_signature(name, job_id, signature_data, title=None, certificate_path=None):
    signatures = get_all_signatures()
    
    # Generate a new signature ID
    signature_id = 1
    if signatures:
        signature_id = max(signature['id'] for signature in signatures) + 1
    
    # Create new signature
    new_signature = {
        'id': signature_id,
        'name': name,
        'title': title or '',
        'job_id': job_id,
        'signature_data': signature_data,
        'date': datetime.utcnow().isoformat(),
        'certificate_path': certificate_path
    }
    
    # Add to signatures list and save
    signatures.append(new_signature)
    save_data(SIGNATURES_FILE, signatures)
    
    return new_signature

# Upload functions
def get_all_uploads():
    return load_data(UPLOADS_FILE)

def get_uploads_by_job_id(job_id):
    uploads = get_all_uploads()
    return [upload for upload in uploads if upload['job_id'] == job_id]

def get_upload_by_id(upload_id):
    uploads = get_all_uploads()
    for upload in uploads:
        if upload['id'] == upload_id:
            return upload
    return None

def create_upload(job_id, filename, original_filename, file_path, file_type=None):
    uploads = get_all_uploads()
    
    # Generate a new upload ID
    upload_id = 1
    if uploads:
        upload_id = max(upload['id'] for upload in uploads) + 1
    
    # Create new upload
    new_upload = {
        'id': upload_id,
        'job_id': job_id,
        'filename': filename,
        'original_filename': original_filename,
        'file_path': file_path,
        'file_type': file_type or 'document',
        'upload_date': datetime.utcnow().isoformat()
    }
    
    # Add to uploads list and save
    uploads.append(new_upload)
    save_data(UPLOADS_FILE, uploads)
    
    return new_upload

# Add some demo data if the files are empty
def add_demo_data():
    jobs = get_all_jobs()
    if not jobs:
        create_job("Website Redesign", "Redesign company website with new branding")
        create_job("Mobile App Development", "Develop a new mobile app for client tracking")
        create_job("Logo Design", "Create a new logo for ABC Corp")