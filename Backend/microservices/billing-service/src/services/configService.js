import { SystemConfigModel } from "../models/SystemConfig.js";

// Cache for config values (refresh every 5 minutes)
let configCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get config value with caching
 */
export const getConfigValue = async (key, defaultValue = null) => {
  const now = Date.now();
  
  // Return cached value if still valid
  if (configCache[key] !== undefined && (now - cacheTimestamp) < CACHE_TTL) {
    return configCache[key];
  }

  // Fetch from database
  const value = await SystemConfigModel.getValue(key, defaultValue);
  
  // Update cache
  configCache[key] = value;
  if (Object.keys(configCache).length === 0) {
    cacheTimestamp = now;
  }

  return value;
};

/**
 * Set config value and clear cache
 */
export const setConfigValue = async (key, value, description = "", category = "general", updatedBy = "admin") => {
  await SystemConfigModel.setValue(key, value, description, category, updatedBy);
  
  // Clear cache for this key
  delete configCache[key];
  
  return value;
};

/**
 * Get all configs
 */
export const getAllConfigs = async () => {
  const configs = await SystemConfigModel.find({}).sort({ category: 1, configKey: 1 });
  return configs;
};

/**
 * Get configs by category
 */
export const getConfigsByCategory = async (category) => {
  const configs = await SystemConfigModel.find({ category }).sort({ configKey: 1 });
  return configs;
};

/**
 * Clear config cache (useful after updates)
 */
export const clearConfigCache = () => {
  configCache = {};
  cacheTimestamp = 0;
};

/**
 * Get pricing configs
 */
export const getPricingConfigs = async () => {
  return {
    pricePerGB: await getConfigValue("storage_price_per_gb", 0.2),
    minimumPurchaseGB: await getConfigValue("storage_minimum_purchase_gb", 3),
    freeTierGB: await getConfigValue("storage_free_tier_gb", 1),
  };
};

