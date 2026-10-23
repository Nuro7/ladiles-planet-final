import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext({});
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch(err => {
            console.error('Supabase getSession failed:', err);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Login failed');
        }

        // Set the session in Supabase client
        const { error } = await supabase.auth.setSession({
            access_token: data.data.session.access_token,
            refresh_token: data.data.session.refresh_token,
        });

        if (error) throw error;

        return data.data;
    };

    const register = async (email, password, name) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Registration failed');
        }

        return data.data;
    };

    const logout = async () => {
        const token = session?.access_token;
        if (token) await fetch(`${API_URL}/auth/logout`, { method:'POST', credentials:'include', headers:{Authorization:'Bearer '+token} }).catch(() => {});
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const value = {
        session,
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
