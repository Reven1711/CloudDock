import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * Create a Stripe checkout session for storage purchase
 */
export const createStorageCheckoutSession = async (
  orgId: string,
  storageGB: number
) => {
  const response = await axios.post(`${API_BASE_URL}/billing/storage/checkout`, {
    orgId,
    storageGB,
  });
  return response.data;
};

/**
 * Get storage purchase history for an organization
 */
export const getStoragePurchaseHistory = async (orgId: string) => {
  const response = await axios.get(`${API_BASE_URL}/billing/storage/history/${orgId}`);
  return response.data;
};

/**
 * Complete a payment after successful checkout (for development without webhooks)
 */
export const completePayment = async (sessionId: string) => {
  const response = await axios.post(`${API_BASE_URL}/billing/storage/complete`, {
    sessionId,
  });
  return response.data;
};

/**
 * Calculate storage price
 */
export const calculateStoragePrice = (storageGB: number): number => {
  return storageGB * 0.20; // $0.20 per GB per month
};

