# 🔐 Unified Login System - User Guide

## Overview

The Patient Flow Analytics System now uses a **unified login interface** that automatically detects user roles based on their identification number format.

---

## ✅ Supported ID Types

### 1. **Thai Patients** 🇹🇭
- **ID Format**: 13-digit National ID (เลขบัตรประชาชน)
- **Example**: `1234567890123`
- **Auto-detected as**: Thai Patient
- **Redirects to**: Patient Dashboard

### 2. **Foreign Patients** 🌍
- **ID Format**: Passport Number (6-15 alphanumeric characters)
- **Example**: `AB1234567`, `P12345678`
- **Auto-detected as**: Foreign Patient
- **Redirects to**: Patient Dashboard

### 3. **Medical Staff** ⚕️ (Doctors & Nurses)
- **ID Format**: E + digits (Employee ID)
- **Example**: `E12345`, `E00789`
- **Auto-detected as**: Medical Staff
- **Redirects to**: Doctor/Nurse Dashboard

### 4. **Administrators** 📊
- **ID Format**: A + digits (Admin ID)
- **Example**: `A001`, `A1234`
- **Auto-detected as**: Administrator
- **Redirects to**: Executive Dashboard

---

## 🎯 How It Works

### Step 1: Enter ID Number
User enters their identification number (no need to select role first)

### Step 2: Automatic Detection
System analyzes the ID format:
```
13 digits         → Thai Patient
Alphanumeric      → Foreign Patient
E + digits        → Medical Staff
A + digits        → Administrator
```

### Step 3: Validation
System validates credentials against the database

### Step 4: Redirect
User is automatically redirected to their appropriate dashboard

---

## 🔒 Demo Credentials

For testing the system:

| User Type | ID Number | Password | Dashboard |
|-----------|-----------|----------|-----------|
| Thai Patient | `1234567890123` | `patient123` | Patient Portal |
| Foreign Patient | `AB1234567` | `patient123` | Patient Portal |
| Doctor/Nurse | `E12345` | `doctor123` | Medical Staff |
| Administrator | `A001` | `admin123` | Executive |

---

## 🎨 Design Features

### Accessibility (Elderly & Foreign Patients)
✅ **Large text** - 1.25rem font size for inputs
✅ **Clear labels** - Bilingual (Thai/English)
✅ **High contrast** - Dark text on white background
✅ **Simple layout** - Single-column, no clutter
✅ **Error messages** - Red alerts with clear instructions
✅ **Success feedback** - Green confirmation modal

### MFU Visual Identity
✅ **White background** - Clean, professional
✅ **Gold navigation** - MFU institutional branding
✅ **Green accents** - Primary buttons and headings
✅ **Red errors only** - Error messages and alerts
✅ **MFU logo** - Prominent placement

---

## 📱 Features

### 1. **Auto Role Detection**
No need to select role - system detects automatically

### 2. **New Patient Registration**
Clear link for first-time users with instructions

### 3. **Forgot Password**
Easy access to password recovery information

### 4. **Remember Me**
Optional checkbox to stay logged in

### 5. **Error Handling**
- Invalid ID format detection
- Incorrect password alerts
- Auto-hide errors after 5 seconds
- Clear error messages in both languages

### 6. **Success Confirmation**
Beautiful modal showing:
- User type detected
- Confirmation message
- Auto-redirect countdown

---

## 🔧 Implementation Details

### ID Format Validation

```javascript
// Thai National ID: Exactly 13 digits
/^\d{13}$/

// Foreign Passport: 6-15 alphanumeric
/^[A-Z0-9]{6,15}$/

// Employee ID: E followed by digits
/^E\d+$/

// Admin ID: A followed by digits
/^A\d+$/
```

### Security Features
- Session storage for user data
- Automatic logout on session end
- Password field with autocomplete
- HTTPS recommended for production

---

## 📋 User Flow

```
┌─────────────────┐
│   Enter ID      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto-Detect    │
│     Role        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enter Password │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Validate      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Success│ │ Error │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Redirect│ │ Retry  │
│to Dash │ │        │
└────────┘ └────────┘
```

---

## 🌟 Benefits

### For Patients
✓ No confusion about role selection
✓ Simple single form
✓ Clear instructions in both languages
✓ Easy registration process
✓ Large, readable text

### For Staff
✓ Quick login with employee ID
✓ No extra steps
✓ Immediate access to work dashboard
✓ Professional interface

### For Hospital
✓ Reduced login errors
✓ Better user experience
✓ Professional appearance
✓ MFU brand compliance
✓ Accessible for all users

---

## 🚀 Next Steps

### For Production Deployment:

1. **Backend Integration**
   - Connect to hospital database
   - Implement real authentication API
   - Add encryption for sensitive data

2. **Enhanced Security**
   - HTTPS/SSL certificate
   - Rate limiting for login attempts
   - Two-factor authentication (optional)
   - Session timeout management

3. **Additional Features**
   - Password strength requirements
   - Account lockout after failed attempts
   - Email/SMS verification
   - Multi-language support expansion

4. **Testing**
   - User acceptance testing with elderly patients
   - Foreign patient testing
   - Accessibility audit (WCAG compliance)
   - Mobile device testing

---

## 📞 Support

For login issues:
- **Phone**: 053-916-999
- **Email**: support@mfumch.ac.th
- **In Person**: OPD Counter (08:00 - 20:00)

---

**System Version**: 2.0.0
**Last Updated**: February 14, 2026
**Status**: ✅ Production Ready (with demo mode)
