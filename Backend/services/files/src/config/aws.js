import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// AWS S3 Configuration
export const s3Config = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

// S3 Client Instance
export const s3Client = new S3Client(s3Config);

// S3 Bucket Configuration
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "clouddock-storage";
export const S3_REGION = process.env.AWS_REGION || "us-east-1";

// Storage Limits
export const FREE_STORAGE_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB in bytes
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB per file

// Virus Scanning Configuration
export const LAMBDA_FUNCTION_NAME =
  process.env.VIRUS_SCAN_LAMBDA || "clouddock-virus-scanner";
export const ENABLE_VIRUS_SCAN =
  process.env.ENABLE_VIRUS_SCAN === "true" || true;
