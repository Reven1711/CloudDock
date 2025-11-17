import mongoose, { Schema } from "mongoose";

const SystemConfigSchema = new Schema({
  configKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  configValue: {
    type: mongoose.Schema.Types.Mixed, // Can be string, number, boolean, object
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    enum: ["pricing", "limits", "features", "general"],
    default: "general",
  },
  updatedBy: {
    type: String,
    default: "system",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to update timestamp
SystemConfigSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get config value
SystemConfigSchema.statics.getValue = async function (key, defaultValue = null) {
  const config = await this.findOne({ configKey: key });
  return config ? config.configValue : defaultValue;
};

// Static method to set config value
SystemConfigSchema.statics.setValue = async function (key, value, description = "", category = "general", updatedBy = "system") {
  const config = await this.findOneAndUpdate(
    { configKey: key },
    {
      configValue: value,
      description,
      category,
      updatedBy,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
  return config;
};

// Static method to initialize default configs
SystemConfigSchema.statics.initializeDefaults = async function () {
  const defaults = [
    {
      configKey: "storage_price_per_gb",
      configValue: 0.2,
      description: "Price per GB of storage per month in USD",
      category: "pricing",
    },
    {
      configKey: "storage_minimum_purchase_gb",
      configValue: 3,
      description: "Minimum storage purchase in GB (must meet Stripe $0.50 minimum)",
      category: "limits",
    },
    {
      configKey: "storage_free_tier_gb",
      configValue: 1,
      description: "Free storage tier in GB for new organizations",
      category: "limits",
    },
    {
      configKey: "storage_max_file_size_mb",
      configValue: 100,
      description: "Maximum file size in MB for uploads",
      category: "limits",
    },
    {
      configKey: "storage_expiry_days",
      configValue: 30,
      description: "Number of days purchased storage is valid",
      category: "limits",
    },
  ];

  for (const defaultConfig of defaults) {
    await this.setValue(
      defaultConfig.configKey,
      defaultConfig.configValue,
      defaultConfig.description,
      defaultConfig.category,
      "system"
    );
  }

  console.log("✅ Default system configurations initialized");
};

export const SystemConfigModel =
  mongoose.models.SystemConfig ||
  mongoose.model("SystemConfig", SystemConfigSchema);

