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

  const signUpOrganization: AuthContextType['signUpOrganization'] = async ({ tenantId, companyName, adminName, adminEmail }) => {
    // Mock: store tenant and set admin as logged in
    const tenantsRaw = localStorage.getItem(STORAGE_KEYS.tenants);
    const tenants = tenantsRaw ? (JSON.parse(tenantsRaw) as Record<string, { id: string; name: string }>) : {};
    tenants[tenantId] = { id: tenantId, name: companyName };
    localStorage.setItem(STORAGE_KEYS.tenants, JSON.stringify(tenants));

    const newUser: AuthUser = {
      id: `admin_${Date.now()}`,
      name: adminName,
      email: adminEmail,
      role: 'admin',
      tenantId,
      approved: true,
    };
    persistUser(newUser);
    ensureTenantUsage(tenantId);
    return newUser;
  };

  const signUpUser: AuthContextType['signUpUser'] = async ({ tenantId, name, email }) => {
    // Mock: create pending user
    const pendingRaw = localStorage.getItem(STORAGE_KEYS.pendingUsers);
    const list = pendingRaw ? (JSON.parse(pendingRaw) as AuthUser[]) : [];
    const newUser: AuthUser = {
      id: `user_${Date.now()}`,
      name,
      email,
      role: 'pending',
      tenantId,
      approved: false,
    };
    list.push(newUser);
    localStorage.setItem(STORAGE_KEYS.pendingUsers, JSON.stringify(list));
    // Log them in with pending state
    persistUser(newUser);
    ensureTenantUsage(tenantId);
    return newUser;
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

  const value = useMemo<AuthContextType>(() => ({
    user,
    usage,
    signOut: () => persistUser(null),
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


