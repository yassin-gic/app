import os
import uuid
import base64
from io import BytesIO
from PIL import Image
from PyPDF2 import PdfReader, PdfWriter
from app import app

def save_base64_image(base64_str, prefix="img"):
    """Save a base64 encoded image to the filesystem"""
    # Remove data URL prefix if present
    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]
    
    # Decode base64 string to bytes
    img_data = base64.b64decode(base64_str)
    
    # Generate unique filename
    filename = f"{prefix}_{uuid.uuid4()}.png"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Save image
    with open(file_path, "wb") as f:
        f.write(img_data)
    
    return filename

def resize_image(file_path, max_size=(800, 800)):
    """Resize an image while maintaining aspect ratio"""
    try:
        img = Image.open(file_path)
        img.thumbnail(max_size)
        img.save(file_path)
        return True
    except Exception as e:
        app.logger.error(f"Error resizing image: {e}")
        return False

def create_signature_certificate(signature_data, name, title, date, certificate_file=None):
    """Create a PDF certificate with signature"""
    # If a certificate file is provided, use it as a template
    if certificate_file:
        try:
            template_pdf = PdfReader(certificate_file)
            output_pdf = PdfWriter()
            
            # Copy all pages from the template
            for page in template_pdf.pages:
                output_pdf.add_page(page)
            
            # Add metadata and signature information
            output_pdf.add_metadata({
                '/Author': name,
                '/Title': f"Signature Certificate: {title}",
                '/Subject': f"Digital Signature Certificate for {name}",
                '/CreationDate': date.strftime("%Y%m%d%H%M%S")
            })
            
            # Generate unique filename
            filename = f"certificate_{uuid.uuid4()}.pdf"
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Save the PDF
            with open(output_path, "wb") as f:
                output_pdf.write(f)
            
            return filename
        except Exception as e:
            app.logger.error(f"Error creating signature certificate: {e}")
            return None
    
    # If no certificate file is provided, create a simple one
    try:
        # Would implement PDF generation from scratch here
        return None
    except Exception as e:
        app.logger.error(f"Error creating signature certificate: {e}")
        return None
