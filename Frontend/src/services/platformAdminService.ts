import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('platformAdminToken') || '';
};

/**
 * Platform admin login
 */
export const platformAdminLogin = async (email: string, password: string) => {
  const response = await axios.post(`${API_BASE_URL}/billing/platform-admin/login`, {
    email,
    password,
  });
  
  if (response.data.success && response.data.token) {
    localStorage.setItem('platformAdminToken', response.data.token);
    localStorage.setItem('platformAdminUser', JSON.stringify(response.data.user));
  }
  
  return response.data;
};

/**
 * Verify platform admin token
 */
export const verifyPlatformAdminToken = async () => {
  const token = getAuthToken();
  if (!token) {
    return { valid: false };
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/billing/platform-admin/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    return { valid: false, error: error.response?.data?.error || 'Token verification failed' };
  }
};

/**
 * Get all system configurations
 */
export const getAllConfigurations = async () => {
  const response = await axios.get(`${API_BASE_URL}/billing/config`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
  return response.data;
};

/**
 * Get configurations by category
 */
export const getConfigurationsByCategory = async (category: string) => {
  const response = await axios.get(`${API_BASE_URL}/billing/config/category/${category}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
  return response.data;
};

/**
 * Get a specific configuration
 */
export const getConfiguration = async (key: string) => {
  const response = await axios.get(`${API_BASE_URL}/billing/config/${key}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
  return response.data;
};

/**
 * Update a configuration value
 */
export const updateConfiguration = async (
  key: string,
  value: any,
  description?: string,
  category?: string
) => {
  const response = await axios.put(
    `${API_BASE_URL}/billing/config/${key}`,
    { value, description, category },
    {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    }
  );
  return response.data;
};

/**
 * Logout platform admin
 */
export const platformAdminLogout = () => {
  localStorage.removeItem('platformAdminToken');
  localStorage.removeItem('platformAdminUser');
};

/**
 * Get current platform admin user
 */
export const getPlatformAdminUser = () => {
  const userStr = localStorage.getItem('platformAdminUser');
  return userStr ? JSON.parse(userStr) : null;
};

