"""
Email Configuration for Password Reset
Supports multiple email providers including Gmail, Outlook, etc.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================
# IMPORTANT: Configure your email settings here before using the password reset feature
# For Gmail: You need to enable "App Passwords" in your Google Account settings
# 1. Go to https://myaccount.google.com/security
# 2. Enable 2-Step Verification
# 3. Go to App Passwords and generate a new password for "Mail"
# 4. Use that 16-character password (not your regular Gmail password)

EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')  # Gmail SMTP server
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))  # TLS port
EMAIL_USERNAME = os.getenv('EMAIL_USERNAME', 'edutrackclassroom@gmail.com')  # Your email
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', 'ybavkxlnnkrzgeta')  # App password (remove spaces!)
EMAIL_FROM_NAME = os.getenv('EMAIL_FROM_NAME', 'EduTrack System')

# Check if email is configured
EMAIL_CONFIGURED = bool(EMAIL_USERNAME and EMAIL_PASSWORD and 
                       EMAIL_USERNAME != 'your-email@gmail.com' and 
                       EMAIL_PASSWORD != 'your-app-password')

# ============================================================================
# SMTP CONFIGURATIONS FOR DIFFERENT PROVIDERS
# ============================================================================
SMTP_PROVIDERS = {
    'gmail': {
        'host': 'smtp.gmail.com',
        'port': 587,
        'use_tls': True
    },
    'outlook': {
        'host': 'smtp-mail.outlook.com',
        'port': 587,
        'use_tls': True
    },
    'yahoo': {
        'host': 'smtp.mail.yahoo.com',
        'port': 587,
        'use_tls': True
    },
    'office365': {
        'host': 'smtp.office365.com',
        'port': 587,
        'use_tls': True
    }
}

# ============================================================================
# EMAIL SENDING FUNCTION
# ============================================================================

def send_password_reset_email(recipient_email, teacher_name, reset_link, teacher_id):
    """
    Send password reset email to teacher
    
    Args:
        recipient_email: Teacher's email address
        teacher_name: Teacher's name
        reset_link: Password reset link with token
        teacher_id: Teacher's ID
        
    Returns:
        tuple: (success: bool, message: str)
    """
    
    # Check if email is configured
    if not EMAIL_CONFIGURED:
        return False, "Email service not configured. Please use RFID reset or contact administrator."
    
    try:
        # Create message
        message = MIMEMultipart('alternative')
        message['Subject'] = 'Password Reset Request - EduTrack'
        message['From'] = f'{EMAIL_FROM_NAME} <{EMAIL_USERNAME}>'
        message['To'] = recipient_email
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }}
                .email-container {{
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .content h2 {{
                    color: #1e40af;
                    margin-top: 0;
                }}
                .content p {{
                    color: #4b5563;
                    line-height: 1.6;
                    font-size: 15px;
                }}
                .reset-button {{
                    display: inline-block;
                    background-color: #1e40af;
                    color: white;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 25px 0;
                    font-weight: 600;
                    font-size: 16px;
                }}
                .reset-button:hover {{
                    background-color: #1e3a8a;
                }}
                .info-box {{
                    background-color: #f0f9ff;
                    border-left: 4px solid #3b82f6;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .warning-box {{
                    background-color: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .footer {{
                    background-color: #f9fafb;
                    padding: 20px;
                    text-align: center;
                    color: #6b7280;
                    font-size: 13px;
                }}
                .code {{
                    background-color: #f3f4f6;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: monospace;
                    color: #1e40af;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>🔒 EduTrack</h1>
                    <p>Password Reset Request</p>
                </div>
                
                <div class="content">
                    <h2>Hello, {teacher_name}!</h2>
                    <p>We received a request to reset the password for your EduTrack account <span class="code">{teacher_id}</span>.</p>
                    
                    <p>Click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="reset-button" style="color: white;">Reset Password</a>
                    </div>
                    
                    <div class="info-box">
                        <strong>📋 Alternative Method:</strong><br>
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="{reset_link}" style="color: #1e40af; word-break: break-all;">{reset_link}</a>
                    </div>
                    
                    <div class="warning-box">
                        <strong>⏰ Important:</strong><br>
                        • This link will expire in <strong>60 minutes</strong><br>
                        • If you didn't request this reset, please ignore this email<br>
                        • For security, this link can only be used once
                    </div>
                    
                    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                        If you're having trouble, contact your system administrator or IT support.
                    </p>
                </div>
                
                <div class="footer">
                    <p>
                        This is an automated email from EduTrack<br>
                        © 2026 EduTrack. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        # Connect to SMTP server and send email
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()  # Enable TLS encryption
            server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
            server.send_message(message)
        
        return True, "Email sent successfully"
        
    except smtplib.SMTPAuthenticationError:
        return False, "Email authentication failed. Please check your email credentials."
    except smtplib.SMTPException as e:
        return False, f"SMTP error occurred: {str(e)}"
    except Exception as e:
        return False, f"Failed to send email: {str(e)}"


def send_password_change_notification(recipient_email, teacher_name, teacher_id):
    """
    Send notification email when password is successfully changed
    
    Args:
        recipient_email: Teacher's email address
        teacher_name: Teacher's name
        teacher_id: Teacher's ID
        
    Returns:
        tuple: (success: bool, message: str)
    """
    
    # Check if email is configured
    if not EMAIL_CONFIGURED:
        return False, "Email service not configured."
    
    try:
        message = MIMEMultipart('alternative')
        message['Subject'] = 'Password Changed Successfully - EduTrack'
        message['From'] = f'{EMAIL_FROM_NAME} <{EMAIL_USERNAME}>'
        message['To'] = recipient_email
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }}
                .email-container {{
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .success-icon {{
                    font-size: 48px;
                    text-align: center;
                    margin-bottom: 20px;
                }}
                .footer {{
                    background-color: #f9fafb;
                    padding: 20px;
                    text-align: center;
                    color: #6b7280;
                    font-size: 13px;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>✅ Password Changed</h1>
                </div>
                <div class="content">
                    <div class="success-icon">🔐</div>
                    <h2>Hello, {teacher_name}!</h2>
                    <p>Your EduTrack password has been successfully changed for account <strong>{teacher_id}</strong>.</p>
                    <p>If you did not make this change, please contact your administrator immediately.</p>
                </div>
                <div class="footer">
                    <p>© 2026 EduTrack. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
            server.send_message(message)
        
        return True, "Notification sent successfully"
        
    except Exception as e:
        # Don't fail the password reset if notification fails
        return False, f"Notification failed: {str(e)}"


# ============================================================================
# CONFIGURATION INSTRUCTIONS
# ============================================================================

"""
📧 EMAIL SETUP INSTRUCTIONS

For Gmail:
1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or Other)
   - Copy the 16-character password
3. Set environment variables:
   - EMAIL_USERNAME=your-email@gmail.com
   - EMAIL_PASSWORD=your-16-char-app-password

For Outlook/Office365:
1. Use your regular email and password
2. Set:
   - EMAIL_HOST=smtp-mail.outlook.com (or smtp.office365.com)
   - EMAIL_PORT=587
   - EMAIL_USERNAME=your-email@outlook.com
   - EMAIL_PASSWORD=your-password

For other providers:
- Update the SMTP_PROVIDERS dictionary above
- Set appropriate environment variables
"""
