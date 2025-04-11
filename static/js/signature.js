document.addEventListener('DOMContentLoaded', function() {
    try {
        // Check if fabric is defined
        if (typeof fabric === 'undefined') {
            console.error("Fabric.js library is not loaded");
            return;
        }

        // Get canvas element
        const canvasElement = document.getElementById('signature-canvas');
        if (!canvasElement) {
            console.error("Signature canvas element not found");
            return;
        }

        // Get the container dimensions
        const container = document.getElementById('signature-canvas-container');
        const containerWidth = container.clientWidth;
        const containerHeight = 300; // Fixed height for the canvas

        // Set canvas dimensions
        canvasElement.width = containerWidth;
        canvasElement.height = containerHeight;

        // Initialize Fabric.js canvas
        const canvas = new fabric.Canvas('signature-canvas', {
            isDrawingMode: true,
            width: containerWidth,
            height: containerHeight,
            backgroundColor: 'white'
        });

        // Configure drawing brush
        canvas.freeDrawingBrush.width = 2;
        canvas.freeDrawingBrush.color = '#000000';

        // Handle window resize
        window.addEventListener('resize', function() {
            const newWidth = container.clientWidth;
            canvas.setWidth(newWidth);
            canvas.renderAll();
        });

        // Clear signature button
        const clearButton = document.getElementById('clear-signature');
        if (clearButton) {
            clearButton.addEventListener('click', function() {
                canvas.clear();
                canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
                
                const previewImg = document.getElementById('signature-preview');
                if (previewImg) {
                    previewImg.style.display = 'none';
                }
                
                const signatureData = document.getElementById('signature-data');
                if (signatureData) {
                    signatureData.value = '';
                }
            });
        }

        // Preview signature button
        const previewButton = document.getElementById('preview-signature');
        if (previewButton) {
            previewButton.addEventListener('click', function() {
                updateSignatureData();
            });
        }

        // Update signature data in the hidden field and show preview
        function updateSignatureData() {
            try {
                if (canvas.getObjects().length > 0) {
                    // Get data URL of the canvas
                    const signatureData = canvas.toDataURL({
                        format: 'png',
                        quality: 1
                    });
                    
                    // Set the data in the hidden field
                    const signatureDataInput = document.getElementById('signature-data');
                    if (signatureDataInput) {
                        signatureDataInput.value = signatureData;
                    }
                    
                    // Show the preview
                    const previewImg = document.getElementById('signature-preview');
                    if (previewImg) {
                        previewImg.src = signatureData;
                        previewImg.style.display = 'block';
                    }
                } else {
                    alert('Please draw your signature first');
                }
            } catch (error) {
                console.error("Error creating signature data:", error);
            }
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
                
                // Update signature data before submission
                if (canvas.getObjects().length === 0) {
                    alert('Please provide a signature');
                    return;
                }
                
                // Get updated signature data
                updateSignatureData();
                
                const signatureDataInput = document.getElementById('signature-data');
                if (!signatureDataInput || !signatureDataInput.value) {
                    alert('Error capturing signature. Please try again.');
                    return;
                }
                
                // Create form data
                const formData = new FormData();
                formData.append('name', name);
                formData.append('title', document.getElementById('title').value.trim());
                formData.append('jobId', jobId);
                formData.append('signatureData', signatureDataInput.value);
                
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
                    canvas.clear();
                    canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
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
