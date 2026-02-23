# Email Configuration Guide for Password Reset Feature

## Overview
The password reset feature requires email configuration to send reset links to teachers. Since this is not yet configured, **use the RFID reset method** as an alternative.

## Quick Setup (Gmail)

### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification" and follow the setup instructions

### Step 2: Generate App Password
1. After enabling 2-Step Verification, go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Type "EduTrack"
4. Click **Generate**
5. Google will show a 16-character password (e.g., `abcd efgh ijkl mnop`)
6. **Copy this password** (you won't see it again)

### Step 3: Update email_config.py
Open `SmartC/email_config.py` and update these lines (around line 18-19):

```python
EMAIL_USERNAME = os.getenv('EMAIL_USERNAME', 'your-actual-email@gmail.com')  # Replace with your email
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', 'abcd efgh ijkl mnop')  # Replace with 16-char app password
```

**Example:**
```python
EMAIL_USERNAME = os.getenv('EMAIL_USERNAME', 'edutrack.school@gmail.com')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', 'zxyw abcd 1234 efgh')
```

### Step 4: Restart the Server
1. Press `Ctrl+C` to stop the server
2. Run: `python SmartC/main.py`
3. Test the email reset feature

## Alternative: Use Environment Variables (Recommended for Production)

Instead of hardcoding in `email_config.py`, set environment variables:

### Windows PowerShell:
```powershell
$env:EMAIL_USERNAME = "your-email@gmail.com"
$env:EMAIL_PASSWORD = "your-app-password"
python SmartC/main.py
```

### Windows CMD:
```cmd
set EMAIL_USERNAME=your-email@gmail.com
set EMAIL_PASSWORD=your-app-password
python SmartC/main.py
```

## Temporary Solution: Use RFID Reset

While email is not configured, teachers can reset their password using the **RFID Reset** tab:

1. Click "Forgot Password?"
2. Click the **RFID Reset** tab
3. Scan RFID card to verify identity
4. Enter new password
5. Submit

This method doesn't require email configuration.

## Troubleshooting

### "Email authentication failed"
- Make sure you're using an **App Password**, not your regular Gmail password
- Remove spaces from the 16-character app password
- Verify 2-Step Verification is enabled

### "SMTP error occurred"
- Check your internet connection
- Verify EMAIL_HOST is `smtp.gmail.com`
- Verify EMAIL_PORT is `587`

### "Email service not configured"
- This means EMAIL_USERNAME or EMAIL_PASSWORD is not set
- Follow steps above to configure

## Other Email Providers

### Outlook/Hotmail:
```python
EMAIL_HOST = 'smtp-mail.outlook.com'
EMAIL_PORT = 587
EMAIL_USERNAME = 'your-email@outlook.com'
EMAIL_PASSWORD = 'your-password'  # Regular password works for Outlook
```

### Yahoo Mail:
```python
EMAIL_HOST = 'smtp.mail.yahoo.com'
EMAIL_PORT = 587
EMAIL_USERNAME = 'your-email@yahoo.com'
EMAIL_PASSWORD = 'your-app-password'  # Generate at account.yahoo.com
```

### Office 365:
```python
EMAIL_HOST = 'smtp.office365.com'
EMAIL_PORT = 587
EMAIL_USERNAME = 'your-email@yourdomain.com'
EMAIL_PASSWORD = 'your-password'
```

## Security Notes

⚠️ **Never commit email credentials to Git!**
- Add `email_config.py` to `.gitignore` if you hardcode credentials
- Prefer environment variables for production
- Use App Passwords instead of regular passwords when possible

## Testing

After configuration, test the email functionality:

1. Open http://127.0.0.1:5000
2. Click "Forgot Password?"
3. Click "Email Reset" tab
4. Enter a test teacher ID or email
5. Check the registered email inbox for the reset link

---
**Need Help?** Contact your system administrator or refer to your email provider's SMTP documentation.
