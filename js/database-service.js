// Database Service for Patient Flow Analytics System
// Handles all database operations with Supabase

class DatabaseService {
    constructor() {
        this.supabase = null;
    }

    // Initialize the service
    async init() {
        this.supabase = getSupabaseClient();
        if (!this.supabase) {
            throw new Error('Failed to initialize Supabase client');
        }
        return this;
    }

    // ==================== Patient Operations ====================

    // Get all patients
    async getAllPatients(filters = {}) {
        try {
            let query = this.supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters if provided
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.department) {
                query = query.eq('current_department', filters.department);
            }

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error fetching patients:', error);
            return { success: false, error: error.message };
        }
    }

    // Get patient by ID
    async getPatientById(patientId) {
        try {
            const { data, error } = await this.supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching patient:', error);
            return { success: false, error: error.message };
        }
    }

    // Create new patient
    async createPatient(patientData) {
        try {
            const { data, error } = await this.supabase
                .from('patients')
                .insert([patientData])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating patient:', error);
            return { success: false, error: error.message };
        }
    }

    // Update patient
    async updatePatient(patientId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('patients')
                .update(updates)
                .eq('id', patientId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error updating patient:', error);
            return { success: false, error: error.message };
        }
    }

    // Search patients by name or ID number
    async searchPatients(searchTerm) {
        try {
            // First, try to get all columns to check what exists
            const { data, error } = await this.supabase
                .from('patients')
                .select('*')
                .or(`name.ilike.%${searchTerm}%,id_number.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error searching patients:', error);
            return { success: false, error: error.message };
        }
    }

    // Get patient with full history (appointments, queue records)
    async getPatientFullHistory(patientId) {
        try {
            // Get patient info
            const patientResult = await this.getPatientById(patientId);
            if (!patientResult.success) throw new Error(patientResult.error);

            // Get appointments
            const { data: appointments, error: apptError } = await this.supabase
                .from('appointments')
                .select('*')
                .eq('patient_id', patientId)
                .order('appointment_date', { ascending: false });

            if (apptError) throw apptError;

            // Get queue history
            const { data: queueHistory, error: queueError } = await this.supabase
                .from('patient_queue')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (queueError) throw queueError;

            return {
                success: true,
                data: {
                    patient: patientResult.data,
                    appointments: appointments || [],
                    queueHistory: queueHistory || []
                }
            };
        } catch (error) {
            console.error('Error fetching patient history:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== Queue Operations ====================

    // Get queue for specific department
    async getQueueByDepartment(department) {
        try {
            const { data, error } = await this.supabase
                .from('patient_queue')
                .select(`
                    *,
                    patients (*)
                `)
                .eq('department', department)
                .eq('status', 'waiting')
                .order('queue_number', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching queue:', error);
            return { success: false, error: error.message };
        }
    }

    // Add patient to queue
    async addToQueue(queueData) {
        try {
            const { data, error } = await this.supabase
                .from('patient_queue')
                .insert([queueData])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error adding to queue:', error);
            return { success: false, error: error.message };
        }
    }

    // Update queue status
    async updateQueueStatus(queueId, status) {
        try {
            const { data, error } = await this.supabase
                .from('patient_queue')
                .update({ 
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', queueId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error updating queue:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== Analytics Operations ====================

    // Get patient flow statistics
    async getFlowStatistics(dateRange = {}) {
        try {
            let query = this.supabase
                .from('patient_flow_stats')
                .select('*');

            if (dateRange.start) {
                query = query.gte('date', dateRange.start);
            }
            if (dateRange.end) {
                query = query.lte('date', dateRange.end);
            }

            const { data, error } = await query.order('date', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching statistics:', error);
            return { success: false, error: error.message };
        }
    }

    // Get department performance metrics
    async getDepartmentMetrics(department, dateRange = {}) {
        try {
            let query = this.supabase
                .from('department_metrics')
                .select('*')
                .eq('department', department);

            if (dateRange.start) {
                query = query.gte('date', dateRange.start);
            }
            if (dateRange.end) {
                query = query.lte('date', dateRange.end);
            }

            const { data, error } = await query.order('date', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching department metrics:', error);
            return { success: false, error: error.message };
        }
    }

    // Get real-time dashboard data
    async getRealTimeDashboard() {
        try {
            const { data, error } = await this.supabase
                .from('real_time_dashboard')
                .select('*')
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== Appointments Operations ====================

    // Get appointments
    async getAppointments(filters = {}) {
        try {
            let query = this.supabase
                .from('appointments')
                .select(`
                    *,
                    patients (*),
                    doctors:user_profiles (*)
                `);

            if (filters.patientId) {
                query = query.eq('patient_id', filters.patientId);
            }
            if (filters.doctorId) {
                query = query.eq('doctor_id', filters.doctorId);
            }
            if (filters.date) {
                query = query.eq('appointment_date', filters.date);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query.order('appointment_date', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return { success: false, error: error.message };
        }
    }

    // Create appointment
    async createAppointment(appointmentData) {
        try {
            const { data, error } = await this.supabase
                .from('appointments')
                .insert([appointmentData])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating appointment:', error);
            return { success: false, error: error.message };
        }
    }

    // Update appointment
    async updateAppointment(appointmentId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('appointments')
                .update(updates)
                .eq('id', appointmentId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error updating appointment:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== Real-time Subscriptions ====================

    // Subscribe to queue changes
    subscribeToQueue(department, callback) {
        return this.supabase
            .channel(`queue_${department}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'patient_queue',
                    filter: `department=eq.${department}`
                },
                callback
            )
            .subscribe();
    }

    // Subscribe to patient status changes
    subscribeToPatientStatus(callback) {
        return this.supabase
            .channel('patient_status')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'patients'
                },
                callback
            )
            .subscribe();
    }

    // Unsubscribe from channel
    unsubscribe(subscription) {
        if (subscription) {
            this.supabase.removeChannel(subscription);
        }
    }
}

// Create global instance
window.databaseService = new DatabaseService();
