import express from "express";
import multer from "multer";
import {
  uploadFile,
  createFolder,
  getFileDownloadUrl,
  getOrganizationFiles,
  deleteFile,
  getStorageInfo,
  recalculateStorage,
  getFileDetails,
} from "../controllers/fileController.js";
import {
  uploadMultipleFiles,
  getBatchUploadProgress,
  getWorkerPoolStats,
  uploadWithCustomParallelism,
} from "../controllers/batchFileController.js";
import {
  generatePresignedUploadUrl,
  confirmFileUpload,
  cancelFileUpload,
} from "../controllers/presignedUploadController.js";
import { handleVirusScanCallback } from "../services/virusScanService.js";

const router = express.Router();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB per file
    files: 100, // Maximum 100 files in a single batch
  },
});

// Direct S3 Upload (for files > 32MB to bypass Cloud Run limit)
router.post("/upload/presigned", generatePresignedUploadUrl); // Get presigned URL
router.post("/upload/confirm", confirmFileUpload); // Confirm upload complete
router.post("/upload/cancel", cancelFileUpload); // Cancel upload

// Single file upload (for files < 32MB)
router.post("/upload", upload.single("file"), uploadFile);

// Batch upload - Multiple files in parallel using Worker Threads
router.post("/upload/batch", upload.array("files", 100), uploadMultipleFiles);

// Custom parallelism upload
router.post(
  "/upload/parallel",
  upload.array("files", 100),
  uploadWithCustomParallelism
);

// Create folder
router.post("/folder", createFolder);

// Get download URL for a file
router.get("/:fileId/download", getFileDownloadUrl);

// Get file details
router.get("/:fileId", getFileDetails);

// Delete file
router.delete("/:fileId", deleteFile);

// Get organization files
router.get("/org/:orgId", getOrganizationFiles);

// Get storage information for organization
router.get("/storage/:orgId", getStorageInfo);

// Recalculate storage usage for organization
router.post("/storage/:orgId/recalculate", recalculateStorage);

// Virus scan callback (from Lambda)
router.post("/virus-scan-callback", handleVirusScanCallback);

// Worker Pool Management
router.get("/worker-pool/stats", getWorkerPoolStats);
router.get("/batch/:batchId/progress", getBatchUploadProgress);

export default router;
