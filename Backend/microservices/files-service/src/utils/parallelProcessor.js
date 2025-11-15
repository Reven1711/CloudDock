import { v4 as uuidv4 } from "uuid";
import { getWorkerPool } from "./workerPool.js";
import { FileModel } from "../models/File.js";
import {
  canUploadFile,
  incrementStorageUsage,
} from "../services/storageService.js";
import { scanFileForVirus } from "../services/virusScanService.js";

/**
 * Parallel File Processor
 * Handles multiple file uploads using worker threads
 */

/**
 * Process multiple files in parallel
 */
export async function processFilesParallel(files, uploadContext) {
  const { orgId, userId, userName, userEmail, folder = "/" } = uploadContext;

  console.log(`📦 Starting parallel processing of ${files.length} files...`);
  const startTime = Date.now();

  try {
    // Step 1: Validate all files and check quota
    const validationResults = await validateFilesParallel(files, orgId);

    const validFiles = files.filter(
      (_, index) => validationResults[index].valid
    );
    const invalidFiles = files.filter(
      (_, index) => !validationResults[index].valid
    );

    if (validFiles.length === 0) {
      return {
        success: false,
        message: "No valid files to upload",
        errors: invalidFiles.map((file, index) => ({
          fileName: file.originalname,
          error: validationResults[index].error,
        })),
      };
    }

    // Step 2: Prepare files for worker processing
    const preparedFiles = validFiles.map((file) => ({
      file: {
        fileId: uuidv4(),
        fileName: `${uuidv4()}.${file.originalname.split(".").pop()}`,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        buffer: file.buffer.toString("base64"), // Convert to base64 for worker transfer
      },
      orgId,
      userId,
      userName,
      userEmail,
      folder,
      s3Config: {
        bucketName: process.env.S3_BUCKET_NAME,
      },
    }));

    // Step 3: Process files using worker pool
    const workerPool = getWorkerPool();
    const processingResults = await workerPool.executeParallel(
      preparedFiles.map((fileData) => ({
        action: "processFile",
        data: fileData,
      }))
    );

    // Step 4: Collect results
    const successfulUploads = [];
    const failedUploads = [];

    processingResults.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        successfulUploads.push(result.value);
      } else {
        failedUploads.push({
          fileName: preparedFiles[index].file.originalName,
          error:
            result.reason?.message || result.value?.error || "Unknown error",
        });
      }
    });

    // Step 5: Save successful uploads to database (batch operation)
    if (successfulUploads.length > 0) {
      await FileModel.insertMany(
        successfulUploads.map((upload) => ({
          fileId: upload.fileId,
          fileName: upload.fileName,
          originalName: upload.originalName,
          mimeType: upload.mimeType,
          size: upload.size,
          s3Key: upload.s3Key,
          s3Bucket: upload.s3Bucket,
          orgId: upload.orgId,
          uploadedBy: upload.uploadedBy,
          folder: upload.folder,
          virusScanStatus: upload.virusScanStatus,
        }))
      );

      // Step 6: Update storage usage (single operation)
      const totalSize = successfulUploads.reduce(
        (sum, file) => sum + file.size,
        0
      );
      await incrementStorageUsage(orgId, totalSize);

      // Step 7: Trigger virus scans in parallel (fire and forget)
      const virusScanPromises = successfulUploads.map((upload) =>
        scanFileForVirus(upload.fileId, upload.s3Key).catch((error) => {
          console.error(`Virus scan failed for ${upload.fileId}:`, error);
        })
      );

      // Don't wait for virus scans
      Promise.allSettled(virusScanPromises);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`✅ Parallel processing completed in ${duration.toFixed(2)}s`);
    console.log(`   - Successful: ${successfulUploads.length}`);
    console.log(`   - Failed: ${failedUploads.length + invalidFiles.length}`);

    return {
      success: true,
      message: `Uploaded ${successfulUploads.length} of ${files.length} files`,
      statistics: {
        totalFiles: files.length,
        successful: successfulUploads.length,
        failed: failedUploads.length + invalidFiles.length,
        processingTime: `${duration.toFixed(2)}s`,
      },
      uploadedFiles: successfulUploads.map((upload) => ({
        fileId: upload.fileId,
        fileName: upload.fileName,
        originalName: upload.originalName,
        size: upload.size,
        mimeType: upload.mimeType,
        virusScanStatus: upload.virusScanStatus,
      })),
      errors: [
        ...invalidFiles.map((file, index) => ({
          fileName: file.originalname,
          error: validationResults[index].error,
        })),
        ...failedUploads,
      ],
    };
  } catch (error) {
    console.error("❌ Parallel processing error:", error);
    throw error;
  }
}

/**
 * Validate multiple files in parallel
 */
async function validateFilesParallel(files, orgId) {
  const validationPromises = files.map(async (file) => {
    try {
      // Check file size
      const MAX_FILE_SIZE =
        parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `File too large. Maximum size is ${
            MAX_FILE_SIZE / (1024 * 1024)
          } MB`,
        };
      }

      // Check if file has valid name
      if (!file.originalname || file.originalname.trim() === "") {
        return {
          valid: false,
          error: "Invalid file name",
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  });

  const results = await Promise.allSettled(validationPromises);
  return results.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { valid: false, error: "Validation failed" }
  );
}

/**
 * Process files in chunks for better memory management
 */
export async function processFilesInChunks(
  files,
  uploadContext,
  chunkSize = 10
) {
  const results = {
    uploadedFiles: [],
    errors: [],
    statistics: {
      totalFiles: files.length,
      successful: 0,
      failed: 0,
      totalProcessingTime: 0,
    },
  };

  console.log(
    `📦 Processing ${files.length} files in chunks of ${chunkSize}...`
  );

  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    console.log(
      `   Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(
        files.length / chunkSize
      )}...`
    );

    const chunkResult = await processFilesParallel(chunk, uploadContext);

    if (chunkResult.success) {
      results.uploadedFiles.push(...chunkResult.uploadedFiles);
      results.errors.push(...chunkResult.errors);
      results.statistics.successful += chunkResult.statistics.successful;
      results.statistics.failed += chunkResult.statistics.failed;
      results.statistics.totalProcessingTime += parseFloat(
        chunkResult.statistics.processingTime
      );
    }
  }

  return {
    success: true,
    message: `Uploaded ${results.statistics.successful} of ${results.statistics.totalFiles} files`,
    ...results,
  };
}

/**
 * Get optimal chunk size based on available memory and file sizes
 */
export function calculateOptimalChunkSize(files) {
  const avgFileSize = files.reduce((sum, f) => sum + f.size, 0) / files.length;
  const availableMemory =
    (process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) * 0.7; // Use 70% of available

  const optimalSize = Math.floor(availableMemory / (avgFileSize * 2)); // 2x buffer for processing

  // Clamp between 5 and 50 files per chunk
  return Math.max(5, Math.min(50, optimalSize));
}
