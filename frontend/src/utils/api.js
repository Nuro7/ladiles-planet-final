import { supabase } from './supabase';

/**
 * Enhanced fetch to include the Supabase access token in the Authorization header
 */
export const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Optional: Trigger logout or redirect to login
        console.warn('Session expired or unauthorized');
    }

    return response;
};
