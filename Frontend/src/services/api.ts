export const API = {
  base: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
  auth: {
    orgSignup: '/auth/org/signup',
    userSignup: '/auth/user/signup',
    login: '/auth/login',
  },
  org: {
    get: (tenantId: string) => `/org/${tenantId}`,
    update: (tenantId: string) => `/org/${tenantId}`,
  },
  users: {
    pending: (tenantId: string) => `/users/pending/${tenantId}`,
    approve: (userId: string) => `/users/${userId}/approve`,
  },
  files: {
    upload: '/files/upload',
    get: (id: string) => `/files/${id}`,
    delete: (id: string) => `/files/${id}`,
  },
  billing: {
    usage: (tenantId: string) => `/billing/usage/${tenantId}`,
  },
  ui: {
    get: (tenantId: string) => `/ui/${tenantId}`,
    update: (tenantId: string) => `/ui/${tenantId}`,
  },
};

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const res = await fetch(API.base + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}


