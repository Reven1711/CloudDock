import {
  processFilesParallel,
  processFilesInChunks,
  calculateOptimalChunkSize,
} from "../utils/parallelProcessor.js";
import { getStorageQuota, canUploadFile } from "../services/storageService.js";
import { getWorkerPool } from "../utils/workerPool.js";

/**
 * Batch File Upload Controller
 * Handles multiple file uploads using parallel processing with Worker Threads
 */

/**
 * Upload multiple files in parallel
 */
export const uploadMultipleFiles = async (req, res) => {
  try {
    const files = req.files;
    const { orgId, userId, userName, userEmail, folder = "/" } = req.body;

    // Validation
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    if (!orgId || !userId || !userName || !userEmail) {
      return res.status(400).json({
        error: "Missing required fields: orgId, userId, userName, userEmail",
      });
    }

    console.log(
      `📤 Batch upload request: ${files.length} files from user ${userName}`
    );

    // Check overall storage quota before processing
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const quotaCheck = await canUploadFile(orgId, totalSize);

    if (!quotaCheck.allowed) {
      return res.status(403).json({
        error: quotaCheck.reason,
        quotaInfo: quotaCheck.quotaInfo,
        statistics: {
          totalFiles: files.length,
          totalSize: totalSize,
          requiredSpace: totalSize,
          availableSpace: quotaCheck.quotaInfo.availableStorage,
        },
      });
    }

    // Process files in parallel using worker threads
    const uploadContext = { orgId, userId, userName, userEmail, folder };

    let result;

    // For large batches, use chunking to manage memory better
    if (files.length > 20) {
      const chunkSize = calculateOptimalChunkSize(files);
      console.log(`📦 Using chunked processing with chunk size: ${chunkSize}`);
      result = await processFilesInChunks(files, uploadContext, chunkSize);
    } else {
      result = await processFilesParallel(files, uploadContext);
    }

    // Get updated storage quota
    const updatedQuota = await getStorageQuota(orgId);

    // Get worker pool statistics
    const workerStats = getWorkerPool().getStats();

    res.json({
      ...result,
      storageInfo: updatedQuota,
      workerPoolStats: workerStats,
    });
  } catch (error) {
    console.error("❌ Batch upload error:", error);
    res.status(500).json({
      error: "Batch upload failed",
      message: error.message,
    });
  }
};

/**
 * Get batch upload progress (for future implementation with WebSockets)
 */
export const getBatchUploadProgress = async (req, res) => {
  try {
    const { batchId } = req.params;

    // This could be extended to track real-time progress
    // For now, return worker pool stats
    const workerStats = getWorkerPool().getStats();

    res.json({
      success: true,
      batchId,
      workerPoolStats: workerStats,
      message: "Real-time progress tracking can be implemented with WebSockets",
    });
  } catch (error) {
    console.error("Get batch progress error:", error);
    res.status(500).json({
      error: "Failed to get batch progress",
      message: error.message,
    });
  }
};

/**
 * Get worker pool statistics
 */
export const getWorkerPoolStats = async (req, res) => {
  try {
    const workerPool = getWorkerPool();
    const stats = workerPool.getStats();

    res.json({
      success: true,
      workerPool: {
        ...stats,
        cpuCores: require("os").cpus().length,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    console.error("Get worker stats error:", error);
    res.status(500).json({
      error: "Failed to get worker pool stats",
      message: error.message,
    });
  }
};

/**
 * Process files with custom parallelism level
 */
export const uploadWithCustomParallelism = async (req, res) => {
  try {
    const files = req.files;
    const {
      orgId,
      userId,
      userName,
      userEmail,
      folder = "/",
      parallelism = 5,
    } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    if (!orgId || !userId || !userName || !userEmail) {
      return res.status(400).json({
        error: "Missing required fields: orgId, userId, userName, userEmail",
      });
    }

    const uploadContext = { orgId, userId, userName, userEmail, folder };
    const chunkSize = parseInt(parallelism);

    console.log(
      `📤 Custom parallel upload: ${files.length} files with parallelism ${chunkSize}`
    );

    const result = await processFilesInChunks(files, uploadContext, chunkSize);
    const updatedQuota = await getStorageQuota(orgId);

    res.json({
      ...result,
      storageInfo: updatedQuota,
      parallelismUsed: chunkSize,
    });
  } catch (error) {
    console.error("Custom parallel upload error:", error);
    res.status(500).json({
      error: "Custom parallel upload failed",
      message: error.message,
    });
  }
};
