import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "../config/aws.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload file to S3
 */
export const uploadToS3 = async (file, orgId, userId) => {
  try {
    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const s3Key = `${orgId}/${userId}/${Date.now()}-${fileName}`;

    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        orgId: orgId,
        userId: userId,
        uploadDate: new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    return {
      s3Key,
      fileName,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Download file from S3
 */
export const downloadFromS3 = async (s3Key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    return response.Body;
  } catch (error) {
    console.error("Error downloading from S3:", error);
    throw new Error(`S3 download failed: ${error.message}`);
  }
};

/**
 * Get presigned URL for file download
 */
export const getPresignedDownloadUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error(`Presigned URL generation failed: ${error.message}`);
  }
};

/**
 * Delete file from S3
 */
export const deleteFromS3 = async (s3Key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw new Error(`S3 deletion failed: ${error.message}`);
  }
};

/**
 * Check if file exists in S3
 */
export const fileExistsInS3 = async (s3Key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === "NotFound") {
      return false;
    }
    throw error;
  }
};

/**
 * Get file metadata from S3
 */
export const getS3FileMetadata = async (s3Key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  } catch (error) {
    console.error("Error getting S3 file metadata:", error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};

/**
 * Get S3 object (for ZIP creation)
 */
export const getS3Object = async (s3Key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    return response;
  } catch (error) {
    console.error("Error getting S3 object:", error);
    throw new Error(`Failed to get S3 object: ${error.message}`);
  }
};