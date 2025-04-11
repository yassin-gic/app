import os
import uuid
import base64
from datetime import datetime
from flask import render_template, request, jsonify, redirect, url_for, flash, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image
from io import BytesIO
import PyPDF2 
from app import app, db
from models import Job, Signature, Upload

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

# Job management routes
@app.route('/jobs')
def list_jobs():
    jobs = Job.query.order_by(Job.created_at.desc()).all()
    return render_template('jobs.html', jobs=jobs)

@app.route('/jobs/new', methods=['POST'])
def create_job():
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        
        if not title:
            return jsonify({'error': 'Job title is required'}), 400
        
        job = Job(title=title, description=description, status='pending')
        db.session.add(job)
        db.session.commit()
        
        return jsonify({
            'id': job.id,
            'title': job.title,
            'description': job.description,
            'status': job.status,
            'created_at': job.created_at.isoformat()
        })

@app.route('/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    job = Job.query.get_or_404(job_id)
    signatures = Signature.query.filter_by(job_id=job_id).all()
    uploads = Upload.query.filter_by(job_id=job_id).all()
    
    return jsonify({
        'id': job.id,
        'title': job.title,
        'description': job.description,
        'status': job.status,
        'created_at': job.created_at.isoformat(),
        'signatures': [{'id': s.id, 'name': s.name, 'date': s.date.isoformat()} for s in signatures],
        'uploads': [{'id': u.id, 'filename': u.original_filename, 'date': u.upload_date.isoformat()} for u in uploads]
    })

@app.route('/jobs/<int:job_id>/status', methods=['PUT'])
def update_job_status(job_id):
    job = Job.query.get_or_404(job_id)
    data = request.json
    
    if 'status' not in data:
        return jsonify({'error': 'Status is required'}), 400
    
    valid_statuses = ['pending', 'in_progress', 'completed']
    if data['status'] not in valid_statuses:
        return jsonify({'error': f'Status must be one of: {", ".join(valid_statuses)}'}), 400
    
    job.status = data['status']
    job.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'id': job.id,
        'title': job.title,
        'status': job.status,
        'updated_at': job.updated_at.isoformat()
    })

# Signature routes
@app.route('/signature')
def signature_page():
    job_id = request.args.get('job_id')
    jobs = Job.query.all()
    return render_template('signature.html', job_id=job_id, jobs=jobs)

@app.route('/signature/save', methods=['POST'])
def save_signature():
    data = request.form
    
    if 'signatureData' not in data or 'name' not in data or 'jobId' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    job_id = data.get('jobId')
    # Verify job exists
    job = Job.query.get_or_404(job_id)
    
    # Save signature to database
    signature = Signature(
        signature_data=data.get('signatureData'),
        name=data.get('name'),
        title=data.get('title', ''),
        job_id=job_id
    )
    
    # Handle certificate if provided
    if 'certificate' in request.files:
        certificate_file = request.files['certificate']
        if certificate_file and allowed_file(certificate_file.filename):
            # Generate unique filename
            filename = secure_filename(certificate_file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            cert_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            certificate_file.save(cert_path)
            
            # Save certificate path to signature
            signature.certificate_path = unique_filename
    
    db.session.add(signature)
    db.session.commit()
    
    return jsonify({
        'id': signature.id,
        'name': signature.name,
        'date': signature.date.isoformat(),
        'message': 'Signature saved successfully'
    })

@app.route('/signature/<int:signature_id>')
def get_signature(signature_id):
    signature = Signature.query.get_or_404(signature_id)
    
    return jsonify({
        'id': signature.id,
        'name': signature.name,
        'title': signature.title,
        'date': signature.date.isoformat(),
        'signature_data': signature.signature_data,
        'has_certificate': bool(signature.certificate_path)
    })

@app.route('/signature/<int:signature_id>/certificate')
def get_certificate(signature_id):
    signature = Signature.query.get_or_404(signature_id)
    
    if not signature.certificate_path:
        return jsonify({'error': 'No certificate found for this signature'}), 404
    
    return send_from_directory(app.config['UPLOAD_FOLDER'], signature.certificate_path)

# Upload routes
@app.route('/upload')
def upload_page():
    job_id = request.args.get('job_id')
    jobs = Job.query.all()
    return render_template('upload.html', job_id=job_id, jobs=jobs)

@app.route('/upload/file', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    job_id = request.form.get('jobId')
    if not job_id:
        return jsonify({'error': 'Job ID is required'}), 400
    
    # Verify job exists
    job = Job.query.get_or_404(job_id)
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        original_filename = secure_filename(file.filename)
        filename = f"{uuid.uuid4()}_{original_filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Determine file type
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        file_type = 'image' if file_extension in ['png', 'jpg', 'jpeg', 'gif'] else 'document'
        
        # Save upload to database
        upload = Upload(
            filename=filename,
            original_filename=original_filename,
            file_path=file_path,
            file_type=file_type,
            job_id=job_id
        )
        
        db.session.add(upload)
        db.session.commit()
        
        return jsonify({
            'id': upload.id,
            'filename': upload.original_filename,
            'file_type': upload.file_type,
            'date': upload.upload_date.isoformat(),
            'message': 'File uploaded successfully'
        })
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/uploads/<int:job_id>')
def get_uploads(job_id):
    uploads = Upload.query.filter_by(job_id=job_id).all()
    
    return jsonify([{
        'id': upload.id,
        'filename': upload.original_filename,
        'file_type': upload.file_type,
        'date': upload.upload_date.isoformat()
    } for upload in uploads])

@app.route('/uploads/file/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/uploads/<int:upload_id>/preview')
def file_preview(upload_id):
    upload = Upload.query.get_or_404(upload_id)
    
    # For images, we can return directly
    if upload.file_type == 'image':
        return redirect(url_for('uploaded_file', filename=upload.filename))
    
    # For PDFs, we might want to return the first page as an image
    if upload.original_filename.endswith('.pdf'):
        # This would be implemented with PyPDF2 to extract the first page
        # as an image and return it
        pass
    
    # For other documents, return a generic placeholder or error
    return jsonify({'error': 'Preview not available for this file type'})
