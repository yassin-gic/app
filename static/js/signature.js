document.addEventListener('DOMContentLoaded', function() {
    try {
        // Make sure the canvas element exists before proceeding
        const canvas = document.getElementById('signature-pad');
        if (!canvas) {
            console.error("Signature pad canvas element not found");
            return;
        }

        // Check if SignaturePad is defined
        if (typeof SignaturePad === 'undefined') {
            console.error("SignaturePad library not loaded");
            return;
        }

        // Initialize signature pad with error handling
        let signaturePad;
        try {
            signaturePad = new SignaturePad(canvas, {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                penColor: 'rgb(0, 0, 0)',
                minWidth: 1,
                maxWidth: 3
            });
        } catch (error) {
            console.error("Error initializing SignaturePad:", error);
            return;
        }

        // Handle canvas resizing with error handling
        function resizeCanvas() {
            try {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.scale(ratio, ratio);
                }
                if (signaturePad) {
                    signaturePad.clear(); // Otherwise the canvas will be cleared
                }
            } catch (error) {
                console.error("Error resizing canvas:", error);
            }
        }
        
        // Set the initial canvas size
        resizeCanvas();
        
        // Resize canvas when window changes size
        window.addEventListener('resize', resizeCanvas);
        
        // Clear signature button
        const clearButton = document.getElementById('clear-signature');
        if (clearButton) {
            clearButton.addEventListener('click', function() {
                if (signaturePad) {
                    signaturePad.clear();
                    const previewImg = document.getElementById('signature-preview');
                    if (previewImg) {
                        previewImg.style.display = 'none';
                    }
                    const signatureData = document.getElementById('signature-data');
                    if (signatureData) {
                        signatureData.value = '';
                    }
                }
            });
        }
        
        // Preview signature when created - Use more compatible event pattern
        if (signaturePad) {
            signaturePad.addEventListener('endStroke', function() {
                try {
                    if (!signaturePad.isEmpty()) {
                        const signatureData = signaturePad.toDataURL('image/png');
                        const signatureDataInput = document.getElementById('signature-data');
                        const previewImg = document.getElementById('signature-preview');
                        
                        if (signatureDataInput) {
                            signatureDataInput.value = signatureData;
                        }
                        
                        if (previewImg) {
                            previewImg.src = signatureData;
                            previewImg.style.display = 'block';
                        }
                    }
                } catch (error) {
                    console.error("Error handling signature end stroke:", error);
                }
            });
        }
    
        // Form submission
        const signatureForm = document.getElementById('signature-form');
        if (signatureForm) {
            signatureForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Validate form
                const name = document.getElementById('name').value.trim();
                const jobId = document.getElementById('job-select').value;
                
                if (!name) {
                    alert('Please enter your name');
                    return;
                }
                
                if (!jobId) {
                    alert('Please select a job');
                    return;
                }
                
                if (signaturePad.isEmpty()) {
                    alert('Please provide a signature');
                    return;
                }
                
                // Create form data
                const formData = new FormData();
                formData.append('name', name);
                formData.append('title', document.getElementById('title').value.trim());
                formData.append('jobId', jobId);
                formData.append('signatureData', signaturePad.toDataURL('image/png'));
                
                // Append certificate if provided
                const certificateInput = document.getElementById('certificate');
                if (certificateInput.files.length > 0) {
                    formData.append('certificate', certificateInput.files[0]);
                }
                
                // Disable submit button and show loading state
                const submitButton = document.getElementById('save-signature');
                const originalButtonText = submitButton.innerHTML;
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
                
                // Send data to server
                fetch('/signature/save', {
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
                    document.getElementById('signature-form').reset();
                    signaturePad.clear();
                    document.getElementById('signature-preview').style.display = 'none';
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('There was a problem saving your signature. Please try again.');
                })
                .finally(() => {
                    // Re-enable submit button
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                });
            });
        }
    } catch (error) {
        console.error("Error initializing signature functionality:", error);
    }
});
