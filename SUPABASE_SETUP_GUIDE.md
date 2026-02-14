# Supabase Backend Setup Guide
## Patient Flow Analytics System - MFU Medical Center

This guide will help you connect your frontend to Supabase backend.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Schema](#database-schema)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Features](#features)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Basic understanding of SQL
- Your frontend files from this project

---

## 🚀 Supabase Project Setup

### Step 1: Create a New Project

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: MFU Medical Center
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your users
   - **Pricing Plan**: Free tier works for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

### Step 2: Get Your API Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

---

## 🗄️ Database Schema

### Step 3: Create Database Tables

Go to **SQL Editor** in your Supabase dashboard and run these queries:

#### 1. User Profiles Table

```sql
-- User profiles with role information
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    id_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'nurse', 'admin')),
    department TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX idx_user_profiles_id_number ON user_profiles(id_number);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = user_id);
```

#### 2. Patients Table

```sql
-- Patient information
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    id_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    blood_type TEXT,
    allergies TEXT[],
    phone TEXT,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_treatment', 'discharged', 'inactive')),
    current_department TEXT,
    admitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patients_id_number ON patients(id_number);
CREATE INDEX idx_patients_status ON patients(status);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Patients can view their own data
CREATE POLICY "Patients view own data" 
ON patients FOR SELECT 
USING (auth.uid() = user_id);

-- Medical staff can view all patients
CREATE POLICY "Staff view all patients" 
ON patients FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('doctor', 'nurse', 'admin')
    )
);
```

#### 3. Patient Queue Table

```sql
-- Queue management
CREATE TABLE patient_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    queue_number INTEGER NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
    estimated_wait_time INTEGER, -- in minutes
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    called_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_queue_department ON patient_queue(department);
CREATE INDEX idx_queue_status ON patient_queue(status);
CREATE INDEX idx_queue_patient ON patient_queue(patient_id);

ALTER TABLE patient_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view queue" 
ON patient_queue FOR SELECT 
TO authenticated 
USING (true);
```

#### 4. Appointments Table

```sql
-- Appointment scheduling
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES auth.users(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    department TEXT NOT NULL,
    appointment_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own appointments" 
ON appointments FOR SELECT 
USING (
    patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Staff view appointments" 
ON appointments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('doctor', 'nurse', 'admin')
    )
);
```

#### 5. Analytics Tables

```sql
-- Patient flow statistics
CREATE TABLE patient_flow_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_patients INTEGER DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    completed_visits INTEGER DEFAULT 0,
    cancelled_visits INTEGER DEFAULT 0,
    average_wait_time NUMERIC(10,2), -- in minutes
    patient_satisfaction NUMERIC(3,2), -- 0.00 to 5.00
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flow_stats_date ON patient_flow_stats(date);

-- Department metrics
CREATE TABLE department_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department TEXT NOT NULL,
    date DATE NOT NULL,
    patient_count INTEGER DEFAULT 0,
    avg_wait_time NUMERIC(10,2),
    utilization_rate NUMERIC(5,2), -- percentage
    staff_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department, date)
);

CREATE INDEX idx_dept_metrics_dept_date ON department_metrics(department, date);

-- Real-time dashboard view
CREATE TABLE real_time_dashboard (
    id UUID PRIMARY KEY DEFAULT 1, -- Single row table
    total_patients_today INTEGER DEFAULT 0,
    patients_in_queue INTEGER DEFAULT 0,
    average_wait_time INTEGER DEFAULT 0,
    staff_on_duty INTEGER DEFAULT 0,
    emergency_cases INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO real_time_dashboard (id) VALUES (1);

-- Make analytics readable by staff
ALTER TABLE patient_flow_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_dashboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view analytics" 
ON patient_flow_stats FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('doctor', 'nurse', 'admin')
    )
);

CREATE POLICY "Staff view dept metrics" 
ON department_metrics FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('doctor', 'nurse', 'admin')
    )
);

CREATE POLICY "Everyone view dashboard" 
ON real_time_dashboard FOR SELECT 
TO authenticated 
USING (true);
```

#### 6. Notifications Table

```sql
-- User notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);
```

#### 7. Update Timestamp Trigger

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at 
BEFORE UPDATE ON user_profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at 
BEFORE UPDATE ON patients 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
BEFORE UPDATE ON appointments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## ⚙️ Configuration

### Step 4: Update Your Frontend Configuration

1. Open `js/supabase-config.js` in your project
2. Replace the placeholder values with your actual credentials:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-project-id.supabase.co', // Your Project URL
    anonKey: 'your-anon-key-here', // Your anon/public key
};
```

### Step 5: Create Demo Users

Run this SQL to create demo users for testing:

```sql
-- Note: You'll need to create these users through Supabase Auth UI or API
-- Then create their profiles:

-- Demo Patient (Thai)
INSERT INTO user_profiles (user_id, id_number, full_name, role, phone, email)
VALUES (
    'user-uuid-here', -- Replace with actual user UUID from auth.users
    '1234567890123',
    'สมชาย ใจดี',
    'patient',
    '0812345678',
    '1234567890123@medihack.local'
);

-- Demo Doctor
INSERT INTO user_profiles (user_id, id_number, full_name, role, department, phone)
VALUES (
    'doctor-uuid-here',
    'E12345',
    'Dr. วิทยา แพทย์เก่ง',
    'doctor',
    'Internal Medicine',
    '0898765432'
);

-- Demo Admin
INSERT INTO user_profiles (user_id, id_number, full_name, role, department)
VALUES (
    'admin-uuid-here',
    'A001',
    'ผู้จัดการ ระบบ',
    'admin',
    'Administration'
);
```

---

## ✅ Testing

### Step 6: Test the Connection

1. Open your `login.html` page in a browser
2. Open Browser Developer Tools (F12) → Console
3. You should see: `✓ Backend services initialized`
4. Try logging in with demo credentials
5. Check the console for any errors

### Testing Checklist:

- [ ] Supabase connection initializes without errors
- [ ] Login with valid credentials works
- [ ] Login redirects to correct dashboard
- [ ] Demo mode works as fallback
- [ ] Session persists on page reload

---

## ✨ Features Implemented

### Authentication Service (`auth-service.js`)
- ✅ Sign in with ID number and password
- ✅ User profile retrieval
- ✅ Role-based authentication
- ✅ Sign out functionality
- ✅ Password reset
- ✅ Session management

### Database Service (`database-service.js`)
- ✅ Patient CRUD operations
- ✅ Queue management
- ✅ Appointment scheduling
- ✅ Analytics data fetching
- ✅ Real-time subscriptions

### Dashboard Service (`dashboard-service.js`)
- ✅ Patient dashboard data
- ✅ Doctor dashboard data
- ✅ Admin dashboard data
- ✅ Notifications
- ✅ Chart data preparation

---

## 🔧 Troubleshooting

### Issue: "Failed to initialize Supabase client"
**Solution**: Check that you've updated `js/supabase-config.js` with your actual credentials.

### Issue: "Authentication failed"
**Solution**: 
1. Verify users exist in Supabase Auth
2. Check that user_profiles table has matching entries
3. Verify Row Level Security policies are set correctly

### Issue: "CORS errors"
**Solution**: 
1. Go to Supabase Dashboard → Settings → API
2. Add your domain to allowed origins
3. For local development, add `http://localhost:*`

### Issue: Demo mode always activates
**Solution**: This is intentional as a fallback. Backend will be used once properly configured.

---

## 📚 Next Steps

### For Production:

1. **Enable Email Confirmation**
   - Go to Authentication → Settings
   - Enable "Confirm email" for new signups

2. **Set up Password Policies**
   - Authentication → Settings → Password Policies
   - Set minimum length, require special characters, etc.

3. **Configure Storage** (for profile pictures, documents)
   - Go to Storage
   - Create buckets for patient-documents, profile-pictures
   - Set up access policies

4. **Set up Realtime** (for live queue updates)
   - Go to Database → Replication
   - Enable replication for relevant tables

5. **Add Monitoring**
   - Set up error tracking
   - Monitor API usage
   - Set up alerts for downtime

---

## 🔒 Security Best Practices

1. **Never commit your Supabase keys to Git**
   - Use environment variables in production
   - Add `supabase-config.js` to `.gitignore`

2. **Use Row Level Security (RLS)**
   - All tables should have RLS enabled
   - Users should only access their own data

3. **Validate user input**
   - Frontend validation is good
   - Backend validation is essential

4. **Use secure connections**
   - Always use HTTPS in production
   - Enable SSL for database connections

---

## 📞 Support

If you need help:
- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: Create an issue in your repository

---

## 📄 License

This project is for educational and demonstration purposes.

---

**Last Updated**: February 14, 2026
**Version**: 1.0.0
