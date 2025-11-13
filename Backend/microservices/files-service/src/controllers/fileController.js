import { FileModel } from "../models/File.js";
import {
  uploadToS3,
  getPresignedDownloadUrl,
  deleteFromS3,
} from "../services/s3Service.js";
import {
  canUploadFile,
  incrementStorageUsage,
  decrementStorageUsage,
  getStorageQuota,
} from "../services/storageService.js";
import { scanFileForVirus } from "../services/virusScanService.js";
import { v4 as uuidv4 } from "uuid";
import { MAX_FILE_SIZE } from "../config/aws.js";

/**
 * Upload a file
 */
export const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const { orgId, userId, userName, userEmail, folder = "/" } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    if (!orgId || !userId || !userName || !userEmail) {
      return res.status(400).json({
        error: "Missing required fields: orgId, userId, userName, userEmail",
      });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${
          MAX_FILE_SIZE / (1024 * 1024)
        } MB`,
      });
    }

    // Check storage quota
    const uploadCheck = await canUploadFile(orgId, file.size);
    if (!uploadCheck.allowed) {
      return res.status(403).json({
        error: uploadCheck.reason,
        quotaInfo: uploadCheck.quotaInfo,
      });
    }

    // Upload to S3
    const s3Result = await uploadToS3(file, orgId, userId);

    // Create file record
    const fileId = uuidv4();
    const fileRecord = new FileModel({
      fileId,
      fileName: s3Result.fileName,
      originalName: s3Result.originalName,
      mimeType: s3Result.mimeType,
      size: s3Result.size,
      s3Key: s3Result.s3Key,
      s3Bucket: process.env.S3_BUCKET_NAME,
      orgId,
      uploadedBy: {
        userId,
        userName,
        userEmail,
      },
      folder,
      virusScanStatus: "pending",
    });

    await fileRecord.save();

    // Update storage usage
    await incrementStorageUsage(orgId, file.size);

    // Trigger virus scan asynchronously
    scanFileForVirus(fileId, s3Result.s3Key).catch((error) => {
      console.error("Virus scan error:", error);
    });

    // Get updated quota
    const updatedQuota = await getStorageQuota(orgId);

    res.json({
      success: true,
      message: "File uploaded successfully",
      file: {
        fileId: fileRecord.fileId,
        fileName: fileRecord.fileName,
        originalName: fileRecord.originalName,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
        uploadedAt: fileRecord.createdAt,
        virusScanStatus: fileRecord.virusScanStatus,
      },
      storageInfo: updatedQuota,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      error: "File upload failed",
      message: error.message,
    });
  }
};

/**
 * Create a folder
 */
export const createFolder = async (req, res) => {
  try {
    const {
      folderName,
      orgId,
      userId,
      userName,
      userEmail,
      parentFolder = "/",
    } = req.body;

    if (!folderName || !orgId || !userId || !userName || !userEmail) {
      return res.status(400).json({
        error:
          "Missing required fields: folderName, orgId, userId, userName, userEmail",
      });
    }

    // Validate folder name
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(folderName)) {
      return res.status(400).json({
        error: 'Folder name contains invalid characters: < > : " / \\ | ? *',
      });
    }

    // Construct folder path
    const folderPath =
      parentFolder === "/"
        ? `/${folderName}/`
        : `${parentFolder}${folderName}/`;

    // Check if folder already exists
    const existingFolder = await FileModel.findOne({
      orgId,
      folder: folderPath,
      fileName: folderName,
      mimeType: "application/vnd.clouddock.folder",
      isDeleted: false,
    });

    if (existingFolder) {
      return res.status(400).json({
        error: "A folder with this name already exists",
      });
    }

    // Create folder record (no S3 upload needed, folders are virtual)
    const fileId = uuidv4();
    const folderRecord = new FileModel({
      fileId,
      fileName: folderName,
      originalName: folderName,
      mimeType: "application/vnd.clouddock.folder",
      size: 0,
      s3Key: `${orgId}/${folderPath}`, // Virtual key for reference
      s3Bucket: process.env.S3_BUCKET_NAME,
      orgId,
      uploadedBy: {
        userId,
        userName,
        userEmail,
      },
      folder: parentFolder,
      virusScanStatus: "clean", // Folders don't need scanning
    });

    await folderRecord.save();

    res.json({
      success: true,
      message: "Folder created successfully",
      folder: {
        fileId: folderRecord.fileId,
        folderName: folderRecord.fileName,
        folderPath: folderPath,
        createdAt: folderRecord.createdAt,
      },
    });
  } catch (error) {
    console.error("Folder creation error:", error);
    res.status(500).json({
      error: "Folder creation failed",
      message: error.message,
    });
  }
};

/**
 * Get presigned download URL for a file
 */
export const getFileDownloadUrl = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { orgId } = req.query;

    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    const file = await FileModel.findOne({ fileId, isDeleted: false });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check organization access
    if (orgId && file.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check virus scan status
    if (file.virusScanStatus === "infected") {
      return res.status(403).json({
        error: "File is infected and cannot be downloaded",
        virusScanResult: file.virusScanResult,
      });
    }

    // Generate presigned URL
    const downloadUrl = await getPresignedDownloadUrl(file.s3Key, 3600);

    res.json({
      success: true,
      downloadUrl,
      file: {
        fileId: file.fileId,
        fileName: file.fileName,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
      },
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Get download URL error:", error);
    res.status(500).json({
      error: "Failed to generate download URL",
      message: error.message,
    });
  }
};

/**
 * Get all files for an organization
 */
export const getOrganizationFiles = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { folder = "/", page = 1, limit = 50 } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const skip = (page - 1) * limit;

    const files = await FileModel.find({
      orgId,
      folder,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalFiles = await FileModel.countDocuments({
      orgId,
      folder,
      isDeleted: false,
    });

    res.json({
      success: true,
      files: files.map((file) => ({
        fileId: file.fileId,
        fileName: file.fileName,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        folder: file.folder,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.createdAt,
        virusScanStatus: file.virusScanStatus,
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalFiles / limit),
        totalFiles,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get organization files error:", error);
    res.status(500).json({
      error: "Failed to retrieve files",
      message: error.message,
    });
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { orgId, userId } = req.query;

    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    const file = await FileModel.findOne({ fileId, isDeleted: false });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check organization access
    if (orgId && file.orgId !== orgId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Soft delete
    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();

    // Update storage usage
    await decrementStorageUsage(file.orgId, file.size);

    // Delete from S3 (optional - can be done later with cleanup job)
    // await deleteFromS3(file.s3Key);

    res.json({
      success: true,
      message: "File deleted successfully",
      fileId: file.fileId,
    });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({
      error: "Failed to delete file",
      message: error.message,
    });
  }
};

/**
 * Get storage quota for organization
 */
export const getStorageInfo = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const quota = await getStorageQuota(orgId);

    res.json({
      success: true,
      storage: quota,
    });
  } catch (error) {
    console.error("Get storage info error:", error);
    res.status(500).json({
      error: "Failed to retrieve storage information",
      message: error.message,
    });
  }
};

/**
 * Get file details
 */
export const getFileDetails = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    const file = await FileModel.findOne({ fileId, isDeleted: false });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      success: true,
      file: {
        fileId: file.fileId,
        fileName: file.fileName,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        folder: file.folder,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.createdAt,
        updatedAt: file.updatedAt,
        virusScanStatus: file.virusScanStatus,
        virusScanResult: file.virusScanResult,
        metadata: file.metadata,
      },
    });
  } catch (error) {
    console.error("Get file details error:", error);
    res.status(500).json({
      error: "Failed to retrieve file details",
      message: error.message,
    });
  }
};

