import { getAllConfigs, getConfigsByCategory, getConfigValue, setConfigValue, clearConfigCache, getPricingConfigs } from "../services/configService.js";

/**
 * Get all system configurations
 */
export const getAllConfigurations = async (req, res) => {
  try {
    const configs = await getAllConfigs();
    
    res.json({
      success: true,
      configs: configs.map((config) => ({
        key: config.configKey,
        value: config.configValue,
        description: config.description,
        category: config.category,
        updatedBy: config.updatedBy,
        updatedAt: config.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get all configs error:", error);
    res.status(500).json({
      error: "Failed to retrieve configurations",
      message: error.message,
    });
  }
};

/**
 * Get configurations by category
 */
export const getConfigurationsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const configs = await getConfigsByCategory(category);
    
    res.json({
      success: true,
      category,
      configs: configs.map((config) => ({
        key: config.configKey,
        value: config.configValue,
        description: config.description,
        updatedBy: config.updatedBy,
        updatedAt: config.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get configs by category error:", error);
    res.status(500).json({
      error: "Failed to retrieve configurations",
      message: error.message,
    });
  }
};

/**
 * Get a specific configuration value
 */
export const getConfiguration = async (req, res) => {
  try {
    const { key } = req.params;
    const { defaultValue } = req.query;
    
    const value = await getConfigValue(key, defaultValue);
    
    res.json({
      success: true,
      key,
      value,
    });
  } catch (error) {
    console.error("Get config error:", error);
    res.status(500).json({
      error: "Failed to retrieve configuration",
      message: error.message,
    });
  }
};

/**
 * Update a configuration value
 */
export const updateConfiguration = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description, category } = req.body;
    // Use platform admin info from middleware
    const updatedBy = req.platformAdmin?.email || req.platformAdmin?.userId || "platform-admin";

    if (value === undefined) {
      return res.status(400).json({
        error: "Missing required field: value",
      });
    }

    await setConfigValue(key, value, description, category, updatedBy);
    clearConfigCache();

    console.log(`✅ Configuration updated: ${key} = ${value} (by platform admin: ${updatedBy})`);

    res.json({
      success: true,
      message: "Configuration updated successfully",
      key,
      value,
      updatedBy,
    });
  } catch (error) {
    console.error("Update config error:", error);
    res.status(500).json({
      error: "Failed to update configuration",
      message: error.message,
    });
  }
};

/**
 * Get pricing configurations (public endpoint)
 */
export const getPricing = async (req, res) => {
  try {
    const pricing = await getPricingConfigs();
    
    res.json({
      success: true,
      pricing: {
        pricePerGB: pricing.pricePerGB,
        minimumPurchaseGB: pricing.minimumPurchaseGB,
        freeTierGB: pricing.freeTierGB,
      },
    });
  } catch (error) {
    console.error("Get pricing error:", error);
    res.status(500).json({
      error: "Failed to retrieve pricing",
      message: error.message,
    });
  }
};

