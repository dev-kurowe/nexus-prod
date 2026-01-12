import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import Cookies from 'js-cookie';
import api from '@/services/api';

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    role_id?: number;
    avatar?: string;
}

export interface CommitteeEvent {
    event_id: number;
    event_name: string;
    event_slug: string;
    status: string;
    position: string;
    division: string;
}

export interface CommitteeStatus {
    is_committee: boolean;
    active_events: CommitteeEvent[];
    active_event_count: number;
    show_admin_dashboard: boolean;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (userData: User, token: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    // Status panitia untuk mahasiswa (role_id = 8)
    committeeStatus: CommitteeStatus | null;
    refreshCommitteeStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [committeeStatus, setCommitteeStatus] = useState<CommitteeStatus | null>(null);

    // Fungsi untuk fetch committee status
    const fetchCommitteeStatus = async (): Promise<CommitteeStatus | null> => {
        try {
            console.log("🔄 Fetching committee status...");
            const response = await api.get('/user/committee-status');
            console.log("📋 Committee status response:", response.data);
            if (response.data?.success) {
                const status = response.data.data;
                setCommitteeStatus(status);
                // Simpan ke localStorage untuk persistence
                localStorage.setItem('committee_status', JSON.stringify(status));
                console.log("✅ Committee status set:", status);
                return status;
            }
            return null;
        } catch (error) {
            console.error("❌ Gagal fetch committee status:", error);
            setCommitteeStatus(null);
            localStorage.removeItem('committee_status');
            return null;
        }
    };

    // Fungsi untuk refresh committee status (bisa dipanggil dari luar)
    const refreshCommitteeStatus = async () => {
        if (user && user.role_id === 8) {
            await fetchCommitteeStatus();
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const token = Cookies.get('token');
            const storedUser = localStorage.getItem('app_user');
            const storedCommitteeStatus = localStorage.getItem('committee_status');
            
            if (token && storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    
                    // Load committee status dari localStorage dulu
                    if (storedCommitteeStatus) {
                        setCommitteeStatus(JSON.parse(storedCommitteeStatus));
                    }
                    
                    // Fetch fresh committee status jika user adalah mahasiswa (role_id = 8)
                    if (parsedUser.role_id === 8) {
                        console.log("👤 User role_id = 8, fetching committee status...");
                        await fetchCommitteeStatus();
                    }
                } catch (error) {
                    console.error("Gagal parsing data user", error);
                    Cookies.remove('token');
                    localStorage.removeItem('app_user');
                    localStorage.removeItem('committee_status');
                }
            }
            setIsLoading(false);
        };
        
        initAuth();
    }, []);

    const login = async (userData: User, token: string): Promise<void> => {
        console.log("🔐 Login called with userData:", userData);
        Cookies.set('token', token, { expires: 7 });
        localStorage.setItem('app_user', JSON.stringify(userData));
        setUser(userData);
        
        // Fetch committee status setelah login jika mahasiswa dan tunggu selesai
        if (userData.role_id === 8) {
            console.log("👤 User adalah mahasiswa (role_id = 8), fetching committee status...");
            await fetchCommitteeStatus();
        }
    };

    const logout = () => {
        Cookies.remove('token');
        localStorage.removeItem('app_user');
        localStorage.removeItem('committee_status');
        setUser(null);
        setCommitteeStatus(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider 
            value={{ 
                isAuthenticated: !!user,
                user, 
                login, 
                logout,
                isLoading,
                committeeStatus,
                refreshCommitteeStatus,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};