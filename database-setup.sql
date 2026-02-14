-- ========================================
-- SUPABASE DATABASE SETUP - Complete Script
-- Patient Flow Analytics System
-- ========================================

-- Run this complete script in Supabase SQL Editor
-- This will create all necessary tables and security policies

-- ========================================
-- 1. USER PROFILES TABLE
-- ========================================

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

CREATE INDEX idx_user_profiles_id_number ON user_profiles(id_number);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- ========================================
-- 2. PATIENTS TABLE
-- ========================================

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

CREATE POLICY "Patients view own data" 
ON patients FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff view all patients" 
ON patients FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('doctor', 'nurse', 'admin')
    )
);

-- ========================================
-- 3. PATIENT QUEUE TABLE
-- ========================================

CREATE TABLE patient_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    queue_number INTEGER NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
    estimated_wait_time INTEGER,
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

-- ========================================
-- 4. APPOINTMENTS TABLE
-- ========================================

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

-- ========================================
-- 5. PATIENT FLOW STATISTICS
-- ========================================

CREATE TABLE patient_flow_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_patients INTEGER DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    completed_visits INTEGER DEFAULT 0,
    cancelled_visits INTEGER DEFAULT 0,
    average_wait_time NUMERIC(10,2),
    patient_satisfaction NUMERIC(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flow_stats_date ON patient_flow_stats(date);

ALTER TABLE patient_flow_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view analytics" 
ON patient_flow_stats FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('doctor', 'nurse', 'admin')
    )
);

-- ========================================
-- 6. DEPARTMENT METRICS
-- ========================================

CREATE TABLE department_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department TEXT NOT NULL,
    date DATE NOT NULL,
    patient_count INTEGER DEFAULT 0,
    avg_wait_time NUMERIC(10,2),
    utilization_rate NUMERIC(5,2),
    staff_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department, date)
);

CREATE INDEX idx_dept_metrics_dept_date ON department_metrics(department, date);

ALTER TABLE department_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view dept metrics" 
ON department_metrics FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('doctor', 'nurse', 'admin')
    )
);

-- ========================================
-- 7. REAL-TIME DASHBOARD
-- ========================================

CREATE TABLE real_time_dashboard (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_patients_today INTEGER DEFAULT 0,
    patients_in_queue INTEGER DEFAULT 0,
    average_wait_time INTEGER DEFAULT 0,
    staff_on_duty INTEGER DEFAULT 0,
    emergency_cases INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO real_time_dashboard (id) VALUES (1);

ALTER TABLE real_time_dashboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone view dashboard" 
ON real_time_dashboard FOR SELECT 
TO authenticated 
USING (true);

-- ========================================
-- 8. NOTIFICATIONS TABLE
-- ========================================

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

-- ========================================
-- 9. UPDATE TIMESTAMP TRIGGER
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at 
BEFORE UPDATE ON user_profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at 
BEFORE UPDATE ON patients 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
BEFORE UPDATE ON appointments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 10. SAMPLE DATA (OPTIONAL)
-- ========================================

-- Insert sample flow stats for today
INSERT INTO patient_flow_stats (
    date, 
    total_patients, 
    total_appointments, 
    completed_visits, 
    average_wait_time, 
    patient_satisfaction
) VALUES (
    CURRENT_DATE,
    25,
    30,
    20,
    15.5,
    4.5
) ON CONFLICT (date) DO NOTHING;

-- Insert sample department metrics
INSERT INTO department_metrics (
    department,
    date,
    patient_count,
    avg_wait_time,
    utilization_rate,
    staff_count
) VALUES 
    ('Emergency', CURRENT_DATE, 12, 8.5, 85.5, 6),
    ('Internal Medicine', CURRENT_DATE, 15, 20.3, 75.0, 4),
    ('Pediatrics', CURRENT_DATE, 8, 12.0, 60.0, 3)
ON CONFLICT (department, date) DO NOTHING;

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- Next steps:
-- 1. Create users in Authentication > Users
-- 2. Add corresponding entries in user_profiles table
-- 3. Update js/supabase-config.js with your credentials
-- 4. Test the login functionality
-- ========================================
