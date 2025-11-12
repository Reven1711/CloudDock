import express from "express";
import multer from "multer";
import {
  uploadFile,
  createFolder,
  getFileDownloadUrl,
  getOrganizationFiles,
  deleteFile,
  getStorageInfo,
  getFileDetails,
} from "../controllers/fileController.js";
import { handleVirusScanCallback } from "../services/virusScanService.js";

const router = express.Router();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
});

// File upload
router.post("/upload", upload.single("file"), uploadFile);

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

// Virus scan callback (from Lambda)
router.post("/virus-scan-callback", handleVirusScanCallback);

export default router;
