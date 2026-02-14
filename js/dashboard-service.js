// Dashboard Data Service
// Handles dashboard-specific data fetching and processing

class DashboardService {
    constructor() {
        this.db = null;
    }

    async init() {
        this.db = window.databaseService;
        if (!this.db.supabase) {
            await this.db.init();
        }
        return this;
    }

    // ==================== Patient Dashboard ====================

    async getPatientDashboardData(patientId) {
        try {
            const [patient, appointments, queueStatus] = await Promise.all([
                this.db.getPatientById(patientId),
                this.db.getAppointments({ patientId }),
                this.getPatientQueueStatus(patientId)
            ]);

            return {
                success: true,
                data: {
                    profile: patient.data,
                    appointments: appointments.data || [],
                    queueStatus: queueStatus.data
                }
            };
        } catch (error) {
            console.error('Error fetching patient dashboard:', error);
            return { success: false, error: error.message };
        }
    }

    async getPatientQueueStatus(patientId) {
        try {
            const { data, error } = await this.db.supabase
                .from('patient_queue')
                .select('*')
                .eq('patient_id', patientId)
                .eq('status', 'waiting')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            return { success: true, data: data[0] || null };
        } catch (error) {
            console.error('Error fetching queue status:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== Doctor Dashboard ====================

    async getDoctorDashboardData(doctorId) {
        try {
            const today = new Date().toISOString().split('T')[0];

            const [todayAppointments, queue, patientStats] = await Promise.all([
                this.db.getAppointments({ doctorId, date: today }),
                this.getDoctorQueue(doctorId),
                this.getDoctorPatientStats(doctorId)
            ]);

            return {
                success: true,
                data: {
                    todayAppointments: todayAppointments.data || [],
                    queue: queue.data || [],
                    stats: patientStats.data
                }
            };
        } catch (error) {
            console.error('Error fetching doctor dashboard:', error);
            return { success: false, error: error.message };
        }
    }

    async getDoctorQueue(doctorId) {
        try {
            // Get doctor's profile to find their department
            const { data: profile } = await this.db.supabase
                .from('user_profiles')
                .select('department')
                .eq('user_id', doctorId)
                .single();

            if (profile && profile.department) {
                return await this.db.getQueueByDepartment(profile.department);
            }

            return { success: true, data: [] };
        } catch (error) {
            console.error('Error fetching doctor queue:', error);
            return { success: false, error: error.message };
        }
    }

    async getDoctorPatientStats(doctorId) {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await this.db.supabase
                .from('appointments')
                .select('status')
                .eq('doctor_id', doctorId)
                .eq('appointment_date', today);

            if (error) throw error;

            const stats = {
                total: data.length,
                completed: data.filter(a => a.status === 'completed').length,
                pending: data.filter(a => a.status === 'pending').length,
                cancelled: data.filter(a => a.status === 'cancelled').length
            };

            return { success: true, data: stats };
        } catch (error) {
            console.error('Error fetching patient stats:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== Admin Dashboard ====================

    async getAdminDashboardData() {
        try {
            const [realTimeData, todayStats, departmentStats] = await Promise.all([
                this.db.getRealTimeDashboard(),
                this.getTodayStatistics(),
                this.getAllDepartmentStats()
            ]);

            return {
                success: true,
                data: {
                    realTime: realTimeData.data,
                    todayStats: todayStats.data,
                    departments: departmentStats.data
                }
            };
        } catch (error) {
            console.error('Error fetching admin dashboard:', error);
            return { success: false, error: error.message };
        }
    }

    async getTodayStatistics() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await this.db.supabase
                .from('patient_flow_stats')
                .select('*')
                .eq('date', today)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

            return { success: true, data: data || this.getDefaultStats() };
        } catch (error) {
            console.error('Error fetching today stats:', error);
            return { success: false, error: error.message };
        }
    }

    async getAllDepartmentStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await this.db.supabase
                .from('department_metrics')
                .select('*')
                .eq('date', today);

            if (error) throw error;

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error fetching department stats:', error);
            return { success: false, error: error.message };
        }
    }

    getDefaultStats() {
        return {
            total_patients: 0,
            total_appointments: 0,
            completed_visits: 0,
            average_wait_time: 0,
            patient_satisfaction: 0
        };
    }

    // ==================== Common Dashboard Functions ====================

    async getNotifications(userId, role) {
        try {
            const { data, error } = await this.db.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return { success: false, error: error.message };
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            const { data, error } = await this.db.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== Chart Data ====================

    async getPatientFlowChartData(days = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const result = await this.db.getFlowStatistics({
                start: startDate.toISOString().split('T')[0]
            });

            if (!result.success) throw new Error(result.error);

            // Format for chart
            const chartData = result.data.map(stat => ({
                date: stat.date,
                patients: stat.total_patients,
                waitTime: stat.average_wait_time,
                satisfaction: stat.patient_satisfaction
            }));

            return { success: true, data: chartData };
        } catch (error) {
            console.error('Error fetching chart data:', error);
            return { success: false, error: error.message };
        }
    }

    async getDepartmentComparisonData() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await this.db.supabase
                .from('department_metrics')
                .select('department, avg_wait_time, patient_count, utilization_rate')
                .eq('date', today);

            if (error) throw error;

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error fetching department comparison:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.dashboardService = new DashboardService();
