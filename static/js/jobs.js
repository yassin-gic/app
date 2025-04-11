document.addEventListener('DOMContentLoaded', function() {
    const newJobForm = document.getElementById('new-job-form');
    const saveJobBtn = document.getElementById('save-job-btn');
    const jobsTableBody = document.getElementById('jobs-table-body');
    
    // Create new job
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
        // Show loading state
        document.getElementById('detail-job-title').textContent = 'Loading...';
        document.getElementById('detail-job-id').textContent = '';
        document.getElementById('detail-job-status').textContent = '';
        document.getElementById('detail-job-created').textContent = '';
        document.getElementById('detail-job-description').textContent = '';
        document.getElementById('detail-signatures-list').innerHTML = '<li class="list-group-item text-center">Loading...</li>';
        document.getElementById('detail-uploads-list').innerHTML = '<li class="list-group-item text-center">Loading...</li>';
        
        fetch(`/jobs/${jobId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(job => {
                // Update modal with job details
                document.getElementById('detail-job-id').textContent = '#' + job.id;
                document.getElementById('detail-job-title').textContent = job.title;
                
                // Format status
                let statusHTML = '';
                if (job.status === 'pending') {
                    statusHTML = '<span class="badge bg-warning">Pending</span>';
                } else if (job.status === 'in_progress') {
                    statusHTML = '<span class="badge bg-info">In Progress</span>';
                } else if (job.status === 'completed') {
                    statusHTML = '<span class="badge bg-success">Completed</span>';
                }
                document.getElementById('detail-job-status').innerHTML = statusHTML;
                
                // Format created date
                const createdDate = new Date(job.created_at);
                document.getElementById('detail-job-created').textContent = createdDate.toLocaleDateString() + ' ' + 
                                                                           createdDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                document.getElementById('detail-job-description').textContent = job.description || 'No description';
                
                // Update URLs for signature and upload links
                document.getElementById('detail-sign-link').href = `/signature?job_id=${job.id}`;
                document.getElementById('detail-upload-link').href = `/upload?job_id=${job.id}`;
                
                // Display signatures
                const signaturesListElement = document.getElementById('detail-signatures-list');
                if (job.signatures && job.signatures.length > 0) {
                    signaturesListElement.innerHTML = '';
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
                        signaturesListElement.appendChild(li);
                    });
                } else {
                    signaturesListElement.innerHTML = '<li class="list-group-item text-center">No signatures yet</li>';
                }
                
                // Display uploads
                const uploadsListElement = document.getElementById('detail-uploads-list');
                if (job.uploads && job.uploads.length > 0) {
                    uploadsListElement.innerHTML = '';
                    job.uploads.forEach(upload => {
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
                                <strong>${upload.filename}</strong>
                                <br><small class="text-muted">Uploaded: ${formattedDate}</small>
                            </div>
                            <a href="/uploads/file/${upload.filename}" class="btn btn-sm btn-outline-primary" download>
                                <i class="fas fa-download"></i>
                            </a>
                        `;
                        uploadsListElement.appendChild(li);
                    });
                } else {
                    uploadsListElement.innerHTML = '<li class="list-group-item text-center">No uploads yet</li>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('detail-job-title').textContent = 'Error loading job details';
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
