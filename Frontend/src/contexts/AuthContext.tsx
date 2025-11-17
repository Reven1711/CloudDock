import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type UserRole = 'admin' | 'user' | 'pending';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  approved: boolean;
}

export interface TenantUsage {
  tenantId: string;
  usedBytes: number;
  quotaBytes: number; // 50GB by default
}

interface AuthContextType {
  user: AuthUser | null;
  usage: TenantUsage | null;
  signOut: () => void;
  signIn: (args: { mode: 'org' | 'user'; tenantId: string; email: string; password: string }) => Promise<AuthUser>;
  signUpOrganization: (args: { tenantId: string; companyName: string; adminName: string; adminEmail: string; password: string }) => Promise<AuthUser>;
  signUpUser: (args: { tenantId: string; name: string; email: string; password: string }) => Promise<AuthUser>;
  approveUser: (userId: string) => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  user: 'auth-user',
  pendingUsers: 'mock-pending-users',
  tenants: 'mock-tenants',
  usage: 'mock-tenant-usage',
};

const FIFTY_GB = 50 * 1024 * 1024 * 1024;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [usage, setUsage] = useState<TenantUsage | null>(null);

  const refresh = () => {
    try {
      const u = localStorage.getItem(STORAGE_KEYS.user);
      if (u) setUser(JSON.parse(u));
      const usageStore = localStorage.getItem(STORAGE_KEYS.usage);
      if (usageStore) {
        const map = JSON.parse(usageStore) as Record<string, TenantUsage>;
        const tenantId = JSON.parse(u || 'null')?.tenantId;
        if (tenantId && map[tenantId]) setUsage(map[tenantId]);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const persistUser = (val: AuthUser | null) => {
    if (val) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(val));
    else localStorage.removeItem(STORAGE_KEYS.user);
    setUser(val);
  };

  const ensureTenantUsage = (tenantId: string) => {
    const usageStore = localStorage.getItem(STORAGE_KEYS.usage);
    const map = usageStore ? (JSON.parse(usageStore) as Record<string, TenantUsage>) : {};
    if (!map[tenantId]) {
      map[tenantId] = { tenantId, usedBytes: 0, quotaBytes: FIFTY_GB };
      localStorage.setItem(STORAGE_KEYS.usage, JSON.stringify(map));
    }
    setUsage(map[tenantId]);
  };

  const signUpOrganization: AuthContextType['signUpOrganization'] = async ({ tenantId, companyName, adminName, adminEmail, password }) => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      console.log('Attempting to connect to:', apiUrl);
      
      const response = await fetch(`${apiUrl}/auth/org/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: companyName, adminName, adminEmail, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Signup failed');
      }
      
      const data = await response.json();
      const newUser: AuthUser = {
        id: data.user.userId,
        name: data.user.name,
        email: adminEmail,
        role: 'admin',
        tenantId,
        approved: true,
      };
      persistUser(newUser);
      ensureTenantUsage(tenantId);
      return newUser;
    } catch (error) {
      throw error;
    }
  };

  const signIn: AuthContextType['signIn'] = async ({ mode, tenantId, email, password }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, orgId: tenantId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      
      const data = await response.json();
      const user: AuthUser = {
        id: data.user.userId,
        name: data.user.name,
        email,
        role: data.user.role,
        tenantId,
        approved: data.user.approved,
      };
      persistUser(user);
      ensureTenantUsage(tenantId);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const signUpUser: AuthContextType['signUpUser'] = async ({ tenantId, name, email, password }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/auth/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: tenantId, name, email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Signup failed');
      }
      
      const data = await response.json();
      const newUser: AuthUser = {
        id: data.user.userId,
        name: data.user.name,
        email,
        role: 'pending',
        tenantId,
        approved: false,
      };
      persistUser(newUser);
      ensureTenantUsage(tenantId);
      return newUser;
    } catch (error) {
      throw error;
    }
  };

  const approveUser: AuthContextType['approveUser'] = async (userId) => {
    const pendingRaw = localStorage.getItem(STORAGE_KEYS.pendingUsers);
    const list = pendingRaw ? (JSON.parse(pendingRaw) as AuthUser[]) : [];
    const idx = list.findIndex(u => u.id === userId);
    if (idx !== -1) {
      const approvedUser = { ...list[idx], role: 'user' as UserRole, approved: true };
      list.splice(idx, 1);
      localStorage.setItem(STORAGE_KEYS.pendingUsers, JSON.stringify(list));
      // If the approved user is currently logged in (unlikely for admin approver), update session
      const current = localStorage.getItem(STORAGE_KEYS.user);
      if (current) {
        const session = JSON.parse(current) as AuthUser;
        if (session.id === approvedUser.id) persistUser(approvedUser);
      }
    }
  };

  const signOut = () => {
    // Clear all auth-related data from localStorage
    persistUser(null);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.usage);
    localStorage.removeItem(STORAGE_KEYS.tenants);
    localStorage.removeItem(STORAGE_KEYS.pendingUsers);
    
    // Clear any other session data
    sessionStorage.clear();
    
    // Clear ALL cookies
    const clearAllCookies = () => {
      const cookies = document.cookie.split(';');
      
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        
        // Delete cookie for current domain
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        
        // Delete cookie for all subdomains
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        
        // Delete cookie for parent domain
        const domain = window.location.hostname.split('.').slice(-2).join('.');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
      }
    };
    
    clearAllCookies();
    
    // Force redirect to home page after logout
    window.location.replace('/');
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    usage,
    signOut,
    signIn,
    signUpOrganization,
    signUpUser,
    approveUser,
    refresh,
  }), [user, usage]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


