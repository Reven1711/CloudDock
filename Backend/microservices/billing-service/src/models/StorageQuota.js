import mongoose, { Schema } from "mongoose";

const StorageQuotaSchema = new Schema({
  orgId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  totalQuota: {
    type: Number,
    required: true,
    default: 1024 * 1024 * 1024, // 1 GB in bytes
  },
  usedStorage: {
    type: Number,
    required: true,
    default: 0,
  },
  fileCount: {
    type: Number,
    required: true,
    default: 0,
  },
  isPaidPlan: {
    type: Boolean,
    default: false,
  },
  paidStorageGB: {
    type: Number,
    default: 0,
  },
  billingCycle: {
    type: String,
    enum: ["monthly", "yearly", "none"],
    default: "none",
  },
  lastCalculated: {
    type: Date,
    default: Date.now,
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
StorageQuotaSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Calculate available storage
StorageQuotaSchema.methods.getAvailableStorage = function () {
  return this.totalQuota - this.usedStorage;
};

// Check if storage quota exceeded
StorageQuotaSchema.methods.isQuotaExceeded = function () {
  return this.usedStorage >= this.totalQuota;
};

// Calculate usage percentage
StorageQuotaSchema.methods.getUsagePercentage = function () {
  return (this.usedStorage / this.totalQuota) * 100;
};

export const StorageQuotaModel =
  mongoose.models.StorageQuota ||
  mongoose.model("StorageQuota", StorageQuotaSchema, "storageQuotas");

