document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-upload');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileIcon = document.getElementById('file-icon');
    const jobSelect = document.getElementById('job-select');
    const uploadsContainer = document.getElementById('uploads-container');
    const noUploadsMessage = document.getElementById('no-uploads-message');
    const uploadCount = document.getElementById('upload-count');
    
    // Show file preview when a file is selected
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const fileType = file.type;
            
            // Show preview container
            previewContainer.classList.remove('d-none');
            
            // Display different preview based on file type
            if (fileType.startsWith('image/')) {
                // For images, show image preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove('d-none');
                    fileInfo.classList.add('d-none');
                };
                reader.readAsDataURL(file);
            } else {
                // For non-images, show file type icon
                imagePreview.classList.add('d-none');
                fileInfo.classList.remove('d-none');
                fileName.textContent = file.name;
                
                // Set appropriate icon based on file type
                if (fileType.includes('pdf')) {
                    fileIcon.className = 'fas fa-file-pdf fa-3x mb-2 text-danger';
                } else if (fileType.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                    fileIcon.className = 'fas fa-file-word fa-3x mb-2 text-primary';
                } else {
                    fileIcon.className = 'fas fa-file fa-3x mb-2';
                }
            }
        }
    });
    
    // Load uploads when a job is selected
    jobSelect.addEventListener('change', function() {
        const jobId = this.value;
        if (jobId) {
            loadJobUploads(jobId);
        } else {
            // Clear uploads display
            uploadsContainer.innerHTML = '<div class="col text-center" id="no-uploads-message"><p class="text-muted">No uploads for this job yet.</p></div>';
            uploadCount.textContent = '0';
        }
    });
    
    // Handle form submission
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate form
        const jobId = jobSelect.value;
        if (!jobId) {
            alert('Please select a job');
            return;
        }
        
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Please select a file to upload');
            return;
        }
        
        // Create form data
        const formData = new FormData();
        formData.append('jobId', jobId);
        formData.append('file', fileInput.files[0]);
        
        // Disable submit button and show loading state
        const uploadBtn = document.getElementById('upload-btn');
        const originalBtnText = uploadBtn.innerHTML;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
        
        // Send data to server
        fetch('/upload/file', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Show success message
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();
            
            // Reset form
            uploadForm.reset();
            previewContainer.classList.add('d-none');
            
            // Reload the job uploads
            loadJobUploads(jobId);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('There was a problem uploading your file. Please try again.');
        })
        .finally(() => {
            // Re-enable submit button
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalBtnText;
        });
    });
    
    // Load job uploads
    function loadJobUploads(jobId) {
        // Show loading state
        uploadsContainer.innerHTML = '<div class="col text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        
        fetch(`/uploads/${jobId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(uploads => {
                // Update upload count
                uploadCount.textContent = uploads.length;
                
                if (uploads.length === 0) {
                    // No uploads
                    uploadsContainer.innerHTML = '<div class="col text-center" id="no-uploads-message"><p class="text-muted">No uploads for this job yet.</p></div>';
                } else {
                    // Display uploads
                    uploadsContainer.innerHTML = '';
                    uploads.forEach(upload => {
                        const uploadDate = new Date(upload.date);
                        const formattedDate = uploadDate.toLocaleDateString() + ' ' + 
                                              uploadDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        
                        let iconClass = 'fas fa-file text-secondary';
                        if (upload.file_type === 'image') {
                            iconClass = 'fas fa-file-image text-primary';
                        } else if (upload.filename.endsWith('.pdf')) {
                            iconClass = 'fas fa-file-pdf text-danger';
                        } else if (upload.filename.endsWith('.doc') || upload.filename.endsWith('.docx')) {
                            iconClass = 'fas fa-file-word text-primary';
                        }
                        
                        const uploadElement = document.createElement('div');
                        uploadElement.className = 'col';
                        uploadElement.innerHTML = `
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <i class="${iconClass} fa-3x mb-2"></i>
                                    <h5 class="card-title">${upload.filename}</h5>
                                    <p class="card-text">
                                        <small class="text-muted">Uploaded: ${formattedDate}</small>
                                    </p>
                                </div>
                                <div class="card-footer">
                                    <button class="btn btn-sm btn-outline-primary preview-btn" 
                                            data-id="${upload.id}" 
                                            data-filename="${upload.filename}"
                                            data-type="${upload.file_type}">
                                        <i class="fas fa-eye me-1"></i> Preview
                                    </button>
                                    <a href="/uploads/file/${upload.filename}" class="btn btn-sm btn-outline-secondary" download>
                                        <i class="fas fa-download me-1"></i> Download
                                    </a>
                                </div>
                            </div>
                        `;
                        uploadsContainer.appendChild(uploadElement);
                    });
                    
                    // Add event listeners to preview buttons
                    document.querySelectorAll('.preview-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const uploadId = this.getAttribute('data-id');
                            const filename = this.getAttribute('data-filename');
                            const type = this.getAttribute('data-type');
                            previewFile(uploadId, filename, type);
                        });
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                uploadsContainer.innerHTML = '<div class="col text-center text-danger"><p>Error loading uploads. Please try again.</p></div>';
            });
    }
    
    // Preview file in modal
    function previewFile(uploadId, filename, type) {
        const modalImagePreview = document.getElementById('modal-image-preview');
        const modalFileInfo = document.getElementById('modal-file-info');
        const modalFileName = document.getElementById('modal-file-name');
        const downloadLink = document.getElementById('download-link');
        const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
        
        // Set download link
        downloadLink.href = `/uploads/file/${filename}`;
        
        // Display different preview based on file type
        if (type === 'image') {
            // For images, show image preview
            modalImagePreview.src = `/uploads/file/${filename}`;
            modalImagePreview.classList.remove('d-none');
            modalFileInfo.classList.add('d-none');
        } else {
            // For non-images, show file type icon
            modalImagePreview.classList.add('d-none');
            modalFileInfo.classList.remove('d-none');
            modalFileName.textContent = filename;
            
            // Set file type icon
            const fileIconElement = modalFileInfo.querySelector('i');
            if (filename.endsWith('.pdf')) {
                fileIconElement.className = 'fas fa-file-pdf fa-4x mb-3 text-danger';
            } else if (filename.endsWith('.doc') || filename.endsWith('.docx')) {
                fileIconElement.className = 'fas fa-file-word fa-4x mb-3 text-primary';
            } else {
                fileIconElement.className = 'fas fa-file fa-4x mb-3';
            }
        }
        
        // Show modal
        previewModal.show();
    }
    
    // Initialize if job_id is provided in URL
    if (jobSelect.value) {
        loadJobUploads(jobSelect.value);
    }
});
