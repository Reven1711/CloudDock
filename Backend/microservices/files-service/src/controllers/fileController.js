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
  recalculateStorageUsage,
} from "../services/storageService.js";
import { scanFileForVirus } from "../services/virusScanService.js";
import { v4 as uuidv4 } from "uuid";
import { MAX_FILE_SIZE } from "../config/aws.js";

/**
 * Calculate the total size of a folder (including all files and subfolders recursively)
 */
const calculateFolderSize = async (orgId, folderName, parentFolder) => {
  try {
    // Construct the folder path
    const folderPath =
      parentFolder === "/" ? `/${folderName}/` : `${parentFolder}${folderName}/`;

    // Find all files and folders within this folder path (recursively)
    // This regex will match the folder path and any nested paths
    const files = await FileModel.find({
      orgId,
      folder: { $regex: `^${folderPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
      isDeleted: false,
      mimeType: { $ne: "application/vnd.clouddock.folder" }, // Exclude folders themselves
    });

    // Also get files directly in this folder
    const directFiles = await FileModel.find({
      orgId,
      folder: folderPath,
      isDeleted: false,
      mimeType: { $ne: "application/vnd.clouddock.folder" },
    });

    // Combine and deduplicate
    const allFiles = [...directFiles, ...files];
    const uniqueFiles = Array.from(new Set(allFiles.map(f => f.fileId)))
      .map(id => allFiles.find(f => f.fileId === id));

    // Sum up all file sizes
    const totalSize = uniqueFiles.reduce((sum, file) => sum + (file.size || 0), 0);

    return totalSize;
  } catch (error) {
    console.error("Error calculating folder size:", error);
    return 0;
  }
};

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

    // Calculate folder sizes for all folders in the list
    const filesWithCalculatedSizes = await Promise.all(
      files.map(async (file) => {
        let calculatedSize = file.size;
        
        // If it's a folder, calculate its total size
        if (file.mimeType === "application/vnd.clouddock.folder") {
          calculatedSize = await calculateFolderSize(
            file.orgId,
            file.fileName,
            file.folder
          );
        }

        return {
          fileId: file.fileId,
          fileName: file.fileName,
          originalName: file.originalName,
          size: calculatedSize,
          mimeType: file.mimeType,
          folder: file.folder,
          uploadedBy: file.uploadedBy,
          uploadedAt: file.createdAt,
          virusScanStatus: file.virusScanStatus,
        };
      })
    );

    res.json({
      success: true,
      files: filesWithCalculatedSizes,
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
 * Bulk delete multiple files
 */
export const bulkDeleteFiles = async (req, res) => {
  try {
    const { fileIds, orgId, userId } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: "File IDs array is required" });
    }

    if (!orgId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const results = {
      successful: [],
      failed: [],
      totalSize: 0,
    };

    // Process each file
    for (const fileId of fileIds) {
      try {
        const file = await FileModel.findOne({ fileId, isDeleted: false });

        if (!file) {
          results.failed.push({
            fileId,
            error: "File not found",
          });
          continue;
        }

        // Check organization access
        if (file.orgId !== orgId) {
          results.failed.push({
            fileId,
            error: "Access denied",
          });
          continue;
        }

        // Skip folders - use deleteFolder endpoint for those
        if (file.mimeType === "application/vnd.clouddock.folder") {
          results.failed.push({
            fileId,
            error: "Use deleteFolder endpoint for folders",
          });
          continue;
        }

        // Soft delete
        file.isDeleted = true;
        file.deletedAt = new Date();
        await file.save();

        // Track size for storage update
        results.totalSize += file.size;

        results.successful.push({
          fileId: file.fileId,
          fileName: file.fileName,
          size: file.size,
        });
      } catch (error) {
        results.failed.push({
          fileId,
          error: error.message,
        });
      }
    }

    // Update storage usage once for all deleted files
    if (results.totalSize > 0) {
      await decrementStorageUsage(orgId, results.totalSize);
    }

    // Get updated storage info
    const storageInfo = await getStorageQuota(orgId);

    res.json({
      success: true,
      message: `Successfully deleted ${results.successful.length} file(s)`,
      statistics: {
        totalRequested: fileIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        totalSizeFreed: results.totalSize,
      },
      deletedFiles: results.successful,
      errors: results.failed,
      storageInfo,
    });
  } catch (error) {
    console.error("Bulk delete files error:", error);
    res.status(500).json({
      error: "Failed to delete files",
      message: error.message,
    });
  }
};

/**
 * Delete a folder and all its contents (files and subfolders)
 */
export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { orgId, userId, recursive } = req.query;

    if (!folderId) {
      return res.status(400).json({ error: "Folder ID is required" });
    }

    if (!orgId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    // Find the folder
    const folder = await FileModel.findOne({
      fileId: folderId,
      orgId,
      isDeleted: false,
      mimeType: "application/vnd.clouddock.folder",
    });

    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Construct the folder path
    const folderPath =
      folder.folder === "/"
        ? `/${folder.fileName}/`
        : `${folder.folder}${folder.fileName}/`;

    // Find all files and subfolders within this folder
    const folderContents = await FileModel.find({
      orgId,
      folder: { $regex: `^${folderPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
      isDeleted: false,
    });

    // If not recursive and folder has contents, return error
    if (recursive !== 'true' && folderContents.length > 0) {
      return res.status(400).json({
        error: "Folder is not empty",
        message: "Use recursive=true to delete folder with contents",
        contentsCount: folderContents.length,
      });
    }

    let totalSizeFreed = 0;
    const deletedItems = [];

    // Delete all contents recursively
    for (const item of folderContents) {
      item.isDeleted = true;
      item.deletedAt = new Date();
      await item.save();

      deletedItems.push({
        fileId: item.fileId,
        fileName: item.fileName,
        mimeType: item.mimeType,
        size: item.size,
      });

      // Only count file sizes, not folder sizes
      if (item.mimeType !== "application/vnd.clouddock.folder") {
        totalSizeFreed += item.size;
      }
    }

    // Delete the folder itself
    folder.isDeleted = true;
    folder.deletedAt = new Date();
    await folder.save();

    deletedItems.push({
      fileId: folder.fileId,
      fileName: folder.fileName,
      mimeType: folder.mimeType,
      size: folder.size,
    });

    // Update storage usage
    if (totalSizeFreed > 0) {
      await decrementStorageUsage(orgId, totalSizeFreed);
    }

    // Get updated storage info
    const storageInfo = await getStorageQuota(orgId);

    res.json({
      success: true,
      message: `Folder "${folder.fileName}" and its contents deleted successfully`,
      deletedFolder: {
        fileId: folder.fileId,
        folderName: folder.fileName,
        path: folderPath,
      },
      statistics: {
        totalItemsDeleted: deletedItems.length,
        filesDeleted: deletedItems.filter(
          (i) => i.mimeType !== "application/vnd.clouddock.folder"
        ).length,
        foldersDeleted: deletedItems.filter(
          (i) => i.mimeType === "application/vnd.clouddock.folder"
        ).length,
        totalSizeFreed,
      },
      deletedItems,
      storageInfo,
    });
  } catch (error) {
    console.error("Delete folder error:", error);
    res.status(500).json({
      error: "Failed to delete folder",
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
 * Recalculate storage usage for organization
 */
export const recalculateStorage = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const quota = await recalculateStorageUsage(orgId);

    res.json({
      success: true,
      message: "Storage usage recalculated successfully",
      storage: {
        orgId: quota.orgId,
        totalQuota: quota.totalQuota,
        usedStorage: quota.usedStorage,
        fileCount: quota.fileCount,
        availableStorage: quota.getAvailableStorage(),
        usagePercentage: quota.getUsagePercentage(),
      },
    });
  } catch (error) {
    console.error("Recalculate storage error:", error);
    res.status(500).json({
      error: "Failed to recalculate storage usage",
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

