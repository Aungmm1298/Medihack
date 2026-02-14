// Supabase Configuration
// Replace these with your actual Supabase project credentials

const SUPABASE_CONFIG = {
    // Get these from your Supabase project settings
    // https://app.supabase.com/project/YOUR_PROJECT/settings/api
    url: 'https://lkqpvdagdewjlcortdxm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrcXB2ZGFnZGV3amxjb3J0ZHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTk2ODksImV4cCI6MjA4NjU3NTY4OX0.i95H8GdLcD1yqmA--xc9RriysdHDMw86TeF5wwVPx38',
};

// Initialize Supabase client
// Make sure to include Supabase JS library in your HTML:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabaseClient = null;

function initSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded. Please include the Supabase CDN script.');
        return null;
    }
    
    if (!supabaseClient) {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    
    return supabaseClient;
}

// Get the Supabase client instance
function getSupabaseClient() {
    if (!supabaseClient) {
        return initSupabase();
    }
    return supabaseClient;
}

// Export for use in other modules
window.getSupabaseClient = getSupabaseClient;
window.initSupabase = initSupabase;
