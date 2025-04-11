from datetime import datetime
from app import db

class Job(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="pending")  # pending, in_progress, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    signatures = db.relationship('Signature', backref='job', lazy=True)
    uploads = db.relationship('Upload', backref='job', lazy=True)

class Signature(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    signature_data = db.Column(db.Text, nullable=False)  # Base64 encoded signature image
    name = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(100))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    certificate_path = db.Column(db.String(255))  # Path to the certificate file
    job_id = db.Column(db.Integer, db.ForeignKey('job.id'), nullable=False)

class Upload(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50))
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    job_id = db.Column(db.Integer, db.ForeignKey('job.id'), nullable=False)
