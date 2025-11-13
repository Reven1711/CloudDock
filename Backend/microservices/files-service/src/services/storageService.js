import { StorageQuotaModel } from "../models/StorageQuota.js";
import { FileModel } from "../models/File.js";
import { FREE_STORAGE_LIMIT } from "../config/aws.js";

/**
 * Initialize storage quota for a new organization
 */
export const initializeStorageQuota = async (orgId) => {
  try {
    const existing = await StorageQuotaModel.findOne({ orgId });
    if (existing) {
      return existing;
    }

    const quota = new StorageQuotaModel({
      orgId,
      totalQuota: FREE_STORAGE_LIMIT,
      usedStorage: 0,
      fileCount: 0,
      isPaidPlan: false,
    });

    await quota.save();
    return quota;
  } catch (error) {
    console.error("Error initializing storage quota:", error);
    throw error;
  }
};

/**
 * Get storage quota for an organization
 */
export const getStorageQuota = async (orgId) => {
  try {
    let quota = await StorageQuotaModel.findOne({ orgId });

    if (!quota) {
      quota = await initializeStorageQuota(orgId);
    }

    return {
      orgId: quota.orgId,
      totalQuota: quota.totalQuota,
      usedStorage: quota.usedStorage,
      availableStorage: quota.getAvailableStorage(),
      fileCount: quota.fileCount,
      usagePercentage: quota.getUsagePercentage(),
      isPaidPlan: quota.isPaidPlan,
      isQuotaExceeded: quota.isQuotaExceeded(),
    };
  } catch (error) {
    console.error("Error getting storage quota:", error);
    throw error;
  }
};

/**
 * Update storage usage after file upload
 */
export const incrementStorageUsage = async (orgId, fileSize) => {
  try {
    const quota = await StorageQuotaModel.findOne({ orgId });

    if (!quota) {
      throw new Error("Storage quota not found for organization");
    }

    quota.usedStorage += fileSize;
    quota.fileCount += 1;
    quota.lastCalculated = new Date();

    await quota.save();
    return quota;
  } catch (error) {
    console.error("Error incrementing storage usage:", error);
    throw error;
  }
};

/**
 * Update storage usage after file deletion
 */
export const decrementStorageUsage = async (orgId, fileSize) => {
  try {
    const quota = await StorageQuotaModel.findOne({ orgId });

    if (!quota) {
      throw new Error("Storage quota not found for organization");
    }

    quota.usedStorage = Math.max(0, quota.usedStorage - fileSize);
    quota.fileCount = Math.max(0, quota.fileCount - 1);
    quota.lastCalculated = new Date();

    await quota.save();
    return quota;
  } catch (error) {
    console.error("Error decrementing storage usage:", error);
    throw error;
  }
};

/**
 * Recalculate storage usage from actual files
 */
export const recalculateStorageUsage = async (orgId) => {
  try {
    const files = await FileModel.find({ orgId, isDeleted: false });

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const fileCount = files.length;

    const quota = await StorageQuotaModel.findOne({ orgId });

    if (!quota) {
      throw new Error("Storage quota not found for organization");
    }

    quota.usedStorage = totalSize;
    quota.fileCount = fileCount;
    quota.lastCalculated = new Date();

    await quota.save();
    return quota;
  } catch (error) {
    console.error("Error recalculating storage usage:", error);
    throw error;
  }
};

/**
 * Check if organization can upload file
 */
export const canUploadFile = async (orgId, fileSize) => {
  try {
    const quota = await getStorageQuota(orgId);

    if (quota.isQuotaExceeded) {
      return {
        allowed: false,
        reason: "Storage quota exceeded",
        quotaInfo: quota,
      };
    }

    if (quota.usedStorage + fileSize > quota.totalQuota) {
      return {
        allowed: false,
        reason: "File size exceeds available storage",
        quotaInfo: quota,
      };
    }

    return {
      allowed: true,
      quotaInfo: quota,
    };
  } catch (error) {
    console.error("Error checking upload permission:", error);
    throw error;
  }
};

/**
 * Upgrade organization to paid plan
 */
export const upgradeToPaidPlan = async (orgId, additionalGB) => {
  try {
    const quota = await StorageQuotaModel.findOne({ orgId });

    if (!quota) {
      throw new Error("Storage quota not found for organization");
    }

    quota.isPaidPlan = true;
    quota.paidStorageGB = additionalGB;
    quota.totalQuota = FREE_STORAGE_LIMIT + additionalGB * 1024 * 1024 * 1024;

    await quota.save();
    return quota;
  } catch (error) {
    console.error("Error upgrading to paid plan:", error);
    throw error;
  }
};

