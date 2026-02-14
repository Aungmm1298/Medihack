// Authentication Service for Patient Flow Analytics System
// Handles user authentication with Supabase

class AuthService {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
    }

    // Initialize the service
    async init() {
        this.supabase = getSupabaseClient();
        if (!this.supabase) {
            throw new Error('Failed to initialize Supabase client');
        }

        // Check for existing session
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
        }

        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.currentUser = session.user;
            } else {
                this.currentUser = null;
            }
        });

        return this;
    }

    // Sign in with ID and password
    async signIn(idNumber, password) {
        try {
            // Use email-based authentication (ID number as username part of email)
            // Format: idnumber@medihack.local (or use actual email if stored)
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: idNumber.includes('@') ? idNumber : `${idNumber}@medihack.local`,
                password: password
            });

            if (error) throw error;

            this.currentUser = data.user;
            
            // Get user role from profiles table
            const userProfile = await this.getUserProfile(data.user.id);
            
            return {
                success: true,
                user: data.user,
                profile: userProfile,
                session: data.session
            };
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: error.message || 'Authentication failed'
            };
        }
    }

    // Get user profile with role information
    async getUserProfile(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    // Sign out
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Register new user (for admin use)
    async registerUser(userData) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: userData.email || `${userData.idNumber}@medihack.local`,
                password: userData.password,
                options: {
                    data: {
                        id_number: userData.idNumber,
                        full_name: userData.fullName,
                        role: userData.role
                    }
                }
            });

            if (error) throw error;

            // Create user profile
            if (data.user) {
                await this.createUserProfile(data.user.id, userData);
            }

            return {
                success: true,
                user: data.user
            };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create user profile in database
    async createUserProfile(userId, userData) {
        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .insert([
                    {
                        user_id: userId,
                        id_number: userData.idNumber,
                        full_name: userData.fullName,
                        role: userData.role,
                        department: userData.department || null,
                        phone: userData.phone || null,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Password reset email sent'
            };
        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update password
    async updatePassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Password updated successfully'
            };
        } catch (error) {
            console.error('Password update error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Create global instance
window.authService = new AuthService();
