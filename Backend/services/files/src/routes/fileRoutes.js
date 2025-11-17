import express from "express";
import multer from "multer";
import {
  uploadFile,
  createFolder,
  getFileDownloadUrl,
  getOrganizationFiles,
  getAllOrganizationFilesForAdmin,
  deleteFile,
  bulkDeleteFiles,
  deleteFolder,
  getStorageInfo,
  getFileDetails,
} from "../controllers/fileController.js";
import { downloadFolderAsZip } from "../controllers/folderDownloadController.js";
import { handleVirusScanCallback } from "../services/virusScanService.js";

const router = express.Router();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 1 * 1024 * 1024 * 1024, // 1 GB
  },
});

// File upload
router.post("/upload", upload.single("file"), uploadFile);

// Create folder
router.post("/folder", createFolder);

// Get download URL for a file
router.get("/:fileId/download", getFileDownloadUrl);

// Download folder as ZIP
router.get("/folder/:folderId/download", downloadFolderAsZip);

// Get file details
router.get("/:fileId", getFileDetails);

// Delete file
router.delete("/:fileId", deleteFile);

// Bulk delete files
router.post("/delete/bulk", bulkDeleteFiles);

// Delete folder (with optional recursive deletion)
router.delete("/folder/:folderId", deleteFolder);

// Get organization files (user-specific)
router.get("/org/:orgId", getOrganizationFiles);

// Get ALL organization files grouped by users (Admin only)
router.get("/org/:orgId/all", getAllOrganizationFilesForAdmin);

// Get storage information for organization
router.get("/storage/:orgId", getStorageInfo);

// Virus scan callback (from Lambda)
router.post("/virus-scan-callback", handleVirusScanCallback);

export default router;
