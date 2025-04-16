document.addEventListener('DOMContentLoaded', function() {
    const newJobForm = document.getElementById('new-job-form');
    const saveJobBtn = document.getElementById('save-job-btn');
    const jobsTableBody = document.getElementById('jobs-table-body');
    
    // Create new job
    if (saveJobBtn) { // Check if the button exists before adding listener
        saveJobBtn.addEventListener('click', function() {
        const title = document.getElementById('job-title').value.trim();
        const description = document.getElementById('job-description').value.trim();
        
        if (!title) {
            alert('Please enter a job title');
            return;
        }
        
        // Disable button and show loading state
        saveJobBtn.disabled = true;
        saveJobBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
        
        // Create form data
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        
        // Send data to server
        fetch('/jobs/new', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(job => {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('newJobModal'));
            modal.hide();
            
            // Add new job to table
            const newRow = document.createElement('tr');
            newRow.setAttribute('data-job-id', job.id);
            
            const createdDate = new Date(job.created_at);
            const formattedDate = createdDate.toLocaleDateString() + ' ' + 
                                 createdDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            newRow.innerHTML = `
                <td>#${job.id}</td>
                <td>${job.title}</td>
                <td><span class="badge bg-warning">Pending</span></td>
                <td>${formattedDate}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary view-job-btn" 
                                data-bs-toggle="modal" data-bs-target="#jobDetailModal" 
                                data-job-id="${job.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-success status-btn" 
                                data-job-id="${job.id}" data-bs-toggle="dropdown">
                            <i class="fas fa-tasks"></i>
                        </button>
                        <div class="dropdown-menu status-dropdown">
                            <a class="dropdown-item status-option" href="#" 
                               data-job-id="${job.id}" data-status="pending">Pending</a>
                            <a class="dropdown-item status-option" href="#" 
                               data-job-id="${job.id}" data-status="in_progress">In Progress</a>
                            <a class="dropdown-item status-option" href="#" 
                               data-job-id="${job.id}" data-status="completed">Completed</a>
                        </div>
                        <a href="/signature?job_id=${job.id}" class="btn btn-outline-info">
                            <i class="fas fa-signature"></i>
                        </a>
                        <a href="/upload?job_id=${job.id}" class="btn btn-outline-secondary">
                            <i class="fas fa-upload"></i>
                        </a>
                    </div>
                </td>
            `;
            
            // Check if the table has a "no jobs" row
            const noJobsRow = jobsTableBody.querySelector('tr td[colspan="5"]');
            if (noJobsRow) {
                jobsTableBody.innerHTML = '';
            }
            
            // Add the new row at the top
            jobsTableBody.insertBefore(newRow, jobsTableBody.firstChild);
            
            // Reset form
            newJobForm.reset();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('There was a problem creating the job. Please try again.');
        })
        .finally(() => {
            // Re-enable button
            saveJobBtn.disabled = false;
            saveJobBtn.innerHTML = 'Create Job';
        });
    });
    }
    
    // View job details
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-job-btn')) {
            const jobId = e.target.closest('.view-job-btn').getAttribute('data-job-id');
            loadJobDetails(jobId);
        }
    });
    
    // Update job status
    document.addEventListener('click', function(e) {
        if (e.target.closest('.status-option')) {
            e.preventDefault();
            const option = e.target.closest('.status-option');
            const jobId = option.getAttribute('data-job-id');
            const status = option.getAttribute('data-status');
            updateJobStatus(jobId, status);
        }
    });
    
    // Load job details
    function loadJobDetails(jobId) {
        console.log('Loading job details for ID:', jobId);
        
        // Get the elements from the modal
        const jobTitleEl = document.getElementById('detail-job-title');
        const jobIdEl = document.getElementById('detail-job-id');
        const jobStatusEl = document.getElementById('detail-job-status');
        const jobCreatedEl = document.getElementById('detail-job-created');
        const jobDescriptionEl = document.getElementById('detail-job-description');
        const signaturesListEl = document.getElementById('detail-signatures-list');
        const uploadsListEl = document.getElementById('detail-uploads-list');
        
        // Check if all elements exist
        if (!jobTitleEl || !jobIdEl || !jobStatusEl || !jobCreatedEl || 
            !jobDescriptionEl || !signaturesListEl || !uploadsListEl) {
            console.error('Missing modal elements');
            return;
        }
        
        // Show loading state
        jobTitleEl.textContent = 'Loading...';
        jobIdEl.textContent = '';
        jobStatusEl.textContent = '';
        jobCreatedEl.textContent = '';
        jobDescriptionEl.textContent = '';
        signaturesListEl.innerHTML = '<li class="list-group-item text-center">Loading...</li>';
        uploadsListEl.innerHTML = '<li class="list-group-item text-center">Loading...</li>';
        
        fetch(`/jobs/${jobId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(job => {
                console.log('Job details received:', job);
                
                // Update modal with job details
                jobIdEl.textContent = '#' + job.id;
                jobTitleEl.textContent = job.title;
                
                // Format status
                let statusHTML = '';
                if (job.status === 'pending') {
                    statusHTML = '<span class="badge bg-warning">Pending</span>';
                } else if (job.status === 'in_progress') {
                    statusHTML = '<span class="badge bg-info">In Progress</span>';
                } else if (job.status === 'completed') {
                    statusHTML = '<span class="badge bg-success">Completed</span>';
                }
                jobStatusEl.innerHTML = statusHTML;
                
                // Format created date
                const createdDate = new Date(job.created_at);
                jobCreatedEl.textContent = createdDate.toLocaleDateString() + ' ' + 
                                          createdDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                jobDescriptionEl.textContent = job.description || 'No description';
                
                // Update URLs for signature and upload links
                const signLinkEl = document.getElementById('detail-sign-link');
                const uploadLinkEl = document.getElementById('detail-upload-link');
                
                if (signLinkEl) signLinkEl.href = `/signature?job_id=${job.id}`;
                if (uploadLinkEl) uploadLinkEl.href = `/upload?job_id=${job.id}`;
                
                // Display signatures
                if (job.signatures && job.signatures.length > 0) {
                    signaturesListEl.innerHTML = '';
                    job.signatures.forEach(signature => {
                        const signatureDate = new Date(signature.date);
                        const formattedDate = signatureDate.toLocaleDateString();
                        
                        const li = document.createElement('li');
                        li.className = 'list-group-item d-flex justify-content-between align-items-center';
                        li.innerHTML = `
                            <div>
                                <strong>${signature.name}</strong>
                                <br><small class="text-muted">Signed: ${formattedDate}</small>
                            </div>
                            <a href="/signature/${signature.id}" class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-eye"></i>
                            </a>
                        `;
                        signaturesListEl.appendChild(li);
                    });
                } else {
                    signaturesListEl.innerHTML = '<li class="list-group-item text-center">No signatures yet</li>';
                }
                // Display uploads
                if (job.uploads && job.uploads.length > 0) {
                    uploadsListEl.innerHTML = '';
                    job.uploads.forEach(upload => {
                        try {
                            const uploadDate = new Date(upload.date);
                            const formattedDate = uploadDate.toLocaleDateString();
                            
                            let fileIcon = 'fa-file';
                            if (upload.filename.endsWith('.pdf')) {
                                fileIcon = 'fa-file-pdf';
                            } else if (upload.filename.endsWith('.jpg') || upload.filename.endsWith('.png') || 
                                      upload.filename.endsWith('.jpeg') || upload.filename.endsWith('.gif')) {
                                fileIcon = 'fa-file-image';
                            } else if (upload.filename.endsWith('.doc') || upload.filename.endsWith('.docx')) {
                                fileIcon = 'fa-file-word';
                            }
                            
                            const li = document.createElement('li');
                            li.className = 'list-group-item d-flex justify-content-between align-items-center';
                            li.innerHTML = `
                                <div>
                                    <i class="fas ${fileIcon} me-2"></i>
                                    <strong>${upload.filename || upload.original_filename}</strong>
                                    <br><small class="text-muted">Uploaded: ${formattedDate}</small>
                                </div>
                                <a href="/uploads/file/${upload.filename}" class="btn btn-sm btn-outline-primary" download>
                                    <i class="fas fa-download"></i>
                                </a>
                            `;
                            uploadsListEl.appendChild(li);
                        } catch(e) {
                            console.error('Error processing upload:', upload, e);
                        }
                    });
                } else {
                    uploadsListEl.innerHTML = '<li class="list-group-item text-center">No uploads yet</li>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                if (jobTitleEl) {
                    jobTitleEl.textContent = 'Error loading job details';
                }
            });
    }
    
    // Update job status
    function updateJobStatus(jobId, status) {
        // Send request to update status
        fetch(`/jobs/${jobId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: status })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(job => {
            // Update UI
            const jobRow = document.querySelector(`tr[data-job-id="${job.id}"]`);
            if (jobRow) {
                const statusCell = jobRow.querySelector('td:nth-child(3)');
                let badgeClass = 'bg-warning';
                let statusText = 'Pending';
                
                if (status === 'in_progress') {
                    badgeClass = 'bg-info';
                    statusText = 'In Progress';
                } else if (status === 'completed') {
                    badgeClass = 'bg-success';
                    statusText = 'Completed';
                }
                
                statusCell.innerHTML = `<span class="badge ${badgeClass}">${statusText}</span>`;
            }
            
            // If the job detail modal is open, update it too
            if (document.getElementById('jobDetailModal').classList.contains('show')) {
                const currentJobId = document.getElementById('detail-job-id').textContent.substring(1);
                if (currentJobId === jobId) {
                    let statusHTML = '';
                    if (status === 'pending') {
                        statusHTML = '<span class="badge bg-warning">Pending</span>';
                    } else if (status === 'in_progress') {
                        statusHTML = '<span class="badge bg-info">In Progress</span>';
                    } else if (status === 'completed') {
                        statusHTML = '<span class="badge bg-success">Completed</span>';
                    }
                    document.getElementById('detail-job-status').innerHTML = statusHTML;
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('There was a problem updating the job status. Please try again.');
        });
    }
});
