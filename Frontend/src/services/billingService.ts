import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Cache for pricing config
let pricingCache: { pricePerGB: number; minimumPurchaseGB: number; freeTierGB: number } | null = null;
let pricingCacheTimestamp = 0;
const PRICING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get pricing configuration from API
 */
export const getPricingConfig = async (): Promise<{
  pricePerGB: number;
  minimumPurchaseGB: number;
  freeTierGB: number;
}> => {
  const now = Date.now();
  
  // Return cached value if still valid
  if (pricingCache && (now - pricingCacheTimestamp) < PRICING_CACHE_TTL) {
    return pricingCache;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/billing/pricing`);
    if (response.data.success && response.data.pricing) {
      pricingCache = response.data.pricing;
      pricingCacheTimestamp = now;
      return pricingCache;
    }
  } catch (error) {
    console.error('Failed to fetch pricing config, using defaults:', error);
  }

  // Fallback to defaults if API fails
  const defaults = {
    pricePerGB: 0.2,
    minimumPurchaseGB: 3,
    freeTierGB: 1,
  };
  pricingCache = defaults;
  pricingCacheTimestamp = now;
  return defaults;
};

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
 * Manually sync all completed purchases to storage quota
 * This will recalculate the total storage based on all completed purchases
 */
export const syncStorageQuota = async (orgId: string) => {
  const response = await axios.post(`${API_BASE_URL}/billing/storage/sync/${orgId}`);
  return response.data;
};

/**
 * Calculate storage price (uses pricing from database)
 */
export const calculateStoragePrice = async (storageGB: number): Promise<number> => {
  const pricing = await getPricingConfig();
  return storageGB * pricing.pricePerGB;
};

/**
 * Get minimum purchase requirement (uses pricing from database)
 */
export const getMinimumPurchaseGB = async (): Promise<number> => {
  const pricing = await getPricingConfig();
  return pricing.minimumPurchaseGB;
};

