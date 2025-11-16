import { s3Client, S3_BUCKET_NAME } from "../config/aws.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FileModel } from "../models/File.js";
import { v4 as uuidv4 } from "uuid";
import {
  canUploadFile,
  incrementStorageUsage,
} from "../services/storageService.js";

/**
 * Generate presigned URL for direct S3 upload
 * This allows frontend to upload directly to S3, bypassing Cloud Run's 32MB limit
 */
export const generatePresignedUploadUrl = async (req, res) => {
  try {
    const { fileName, fileSize, mimeType, orgId, userId, userName, userEmail, folder = "/" } = req.body;

    if (!fileName || !fileSize || !mimeType || !orgId || !userId || !userName || !userEmail) {
      return res.status(400).json({
        error: "Missing required fields: fileName, fileSize, mimeType, orgId, userId, userName, userEmail",
      });
    }

    // Check storage quota
    const uploadCheck = await canUploadFile(orgId, fileSize);
    if (!uploadCheck.allowed) {
      return res.status(403).json({
        error: uploadCheck.reason,
        quotaInfo: uploadCheck.quotaInfo,
      });
    }

    // Generate unique file ID and S3 key
    const fileId = uuidv4();
    const timestamp = Date.now();
    const s3Key = `${orgId}/${folder === "/" ? "" : folder}${timestamp}-${fileId}-${fileName}`;

    // Create presigned URL for upload (valid for 15 minutes)
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
      Metadata: {
        fileId,
        orgId,
        userId,
        uploadedBy: userName,
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900, // 15 minutes
    });

    // Create pending file record (will be confirmed after upload)
    const fileRecord = new FileModel({
      fileId,
      fileName,
      originalName: fileName,
      mimeType,
      size: fileSize,
      s3Key,
      s3Bucket: S3_BUCKET_NAME,
      orgId,
      uploadedBy: {
        userId,
        userName,
        userEmail,
      },
      folder,
      virusScanStatus: "pending",
      metadata: {
        uploadStatus: "pending", // Will be updated to "completed" after confirmation
        presignedUpload: true,
      },
    });

    await fileRecord.save();

    res.json({
      success: true,
      fileId,
      presignedUrl,
      s3Key,
      expiresIn: 900,
      message: "Upload directly to this URL using PUT request",
    });
  } catch (error) {
    console.error("Generate presigned URL error:", error);
    res.status(500).json({
      error: "Failed to generate presigned URL",
      message: error.message,
    });
  }
};

/**
 * Confirm file upload completion
 * Called by frontend after successful upload to S3
 */
export const confirmFileUpload = async (req, res) => {
  try {
    const { fileId, orgId } = req.body;

    if (!fileId || !orgId) {
      return res.status(400).json({
        error: "Missing required fields: fileId, orgId",
      });
    }

    const file = await FileModel.findOne({ fileId, orgId, isDeleted: false });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Update file status to completed
    file.metadata.uploadStatus = "completed";
    await file.save();

    // Update storage usage
    await incrementStorageUsage(orgId, file.size);

    // TODO: Trigger virus scan asynchronously if enabled
    // scanFileForVirus(fileId, file.s3Key).catch(console.error);

    res.json({
      success: true,
      message: "File upload confirmed",
      file: {
        fileId: file.fileId,
        fileName: file.fileName,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        uploadedAt: file.createdAt,
      },
    });
  } catch (error) {
    console.error("Confirm upload error:", error);
    res.status(500).json({
      error: "Failed to confirm upload",
      message: error.message,
    });
  }
};

/**
 * Cancel pending upload
 * Called if upload fails or is cancelled
 */
export const cancelFileUpload = async (req, res) => {
  try {
    const { fileId, orgId } = req.body;

    if (!fileId || !orgId) {
      return res.status(400).json({
        error: "Missing required fields: fileId, orgId",
      });
    }

    const file = await FileModel.findOne({ fileId, orgId, isDeleted: false });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Mark as deleted (soft delete)
    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();

    res.json({
      success: true,
      message: "Upload cancelled",
    });
  } catch (error) {
    console.error("Cancel upload error:", error);
    res.status(500).json({
      error: "Failed to cancel upload",
      message: error.message,
    });
  }
};

