import { parentPort, workerData } from "worker_threads";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mongoose from "mongoose";

/**
 * File Processor Worker Thread
 * Handles individual file processing including:
 * - Validation
 * - S3 Upload
 * - Database record creation
 */

// Initialize S3 client
const s3Client = new S3Client({
  region: workerData.awsConfig.region,
  credentials: {
    accessKeyId: workerData.awsConfig.accessKeyId,
    secretAccessKey: workerData.awsConfig.secretAccessKey,
  },
});

/**
 * Process a single file
 */
async function processFile(fileData) {
  try {
    const { file, orgId, userId, userName, userEmail, folder, s3Config } =
      fileData;

    // 1. Validate file
    console.log(
      `[Worker ${workerData.workerId}] Processing file: ${file.originalName}`
    );

    // 2. Generate S3 key
    const fileExtension = file.originalName.split(".").pop();
    const timestamp = Date.now();
    const s3Key = `${orgId}/${userId}/${timestamp}-${file.fileName}`;

    // 3. Upload to S3
    const uploadParams = {
      Bucket: s3Config.bucketName,
      Key: s3Key,
      Body: Buffer.from(file.buffer, "base64"),
      ContentType: file.mimeType,
      Metadata: {
        originalName: file.originalName,
        orgId: orgId,
        userId: userId,
        uploadDate: new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    console.log(
      `[Worker ${workerData.workerId}] File uploaded to S3: ${s3Key}`
    );

    // Return processed file info
    return {
      success: true,
      fileId: file.fileId,
      fileName: file.fileName,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      s3Key,
      s3Bucket: s3Config.bucketName,
      orgId,
      uploadedBy: {
        userId,
        userName,
        userEmail,
      },
      folder,
      virusScanStatus: "pending",
    };
  } catch (error) {
    console.error(
      `[Worker ${workerData.workerId}] Error processing file:`,
      error
    );
    return {
      success: false,
      fileId: fileData.file.fileId,
      fileName: fileData.file.originalName,
      error: error.message,
    };
  }
}

/**
 * Database operation worker
 */
async function saveToDatabaseBatch(processedFiles, mongoUri) {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);

    // Import File model (need to define schema here or pass it)
    const fileSchema = new mongoose.Schema(
      {
        fileId: { type: String, required: true, unique: true },
        fileName: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        s3Key: { type: String, required: true },
        s3Bucket: { type: String, required: true },
        orgId: { type: String, required: true, index: true },
        uploadedBy: {
          userId: { type: String, required: true },
          userName: { type: String, required: true },
          userEmail: { type: String, required: true },
        },
        folder: { type: String, default: "/", index: true },
        virusScanStatus: {
          type: String,
          enum: ["pending", "scanning", "clean", "infected", "error"],
          default: "pending",
        },
        virusScanResult: {
          scannedAt: Date,
          engine: String,
          threats: [String],
        },
        isDeleted: { type: Boolean, default: false },
        deletedAt: Date,
        metadata: mongoose.Schema.Types.Mixed,
      },
      {
        timestamps: true,
      }
    );

    const FileModel =
      mongoose.models.File || mongoose.model("File", fileSchema);

    // Bulk insert successful files
    const successfulFiles = processedFiles.filter((f) => f.success);
    if (successfulFiles.length > 0) {
      await FileModel.insertMany(
        successfulFiles.map((f) => ({
          fileId: f.fileId,
          fileName: f.fileName,
          originalName: f.originalName,
          mimeType: f.mimeType,
          size: f.size,
          s3Key: f.s3Key,
          s3Bucket: f.s3Bucket,
          orgId: f.orgId,
          uploadedBy: f.uploadedBy,
          folder: f.folder,
          virusScanStatus: f.virusScanStatus,
        }))
      );
    }

    await mongoose.connection.close();

    return {
      success: true,
      insertedCount: successfulFiles.length,
    };
  } catch (error) {
    console.error(`[Worker ${workerData.workerId}] Database error:`, error);
    await mongoose.connection.close();
    throw error;
  }
}

// Message handler
if (parentPort) {
  parentPort.on("message", async (message) => {
    try {
      const { action, data } = message;

      if (action === "processFile") {
        const result = await processFile(data);
        parentPort.postMessage({ type: "result", data: result });
      } else if (action === "saveToDatabase") {
        const result = await saveToDatabaseBatch(data.files, data.mongoUri);
        parentPort.postMessage({ type: "dbResult", data: result });
      } else if (action === "processBatch") {
        // Process multiple files in this worker
        const results = [];
        for (const fileData of data.files) {
          const result = await processFile(fileData);
          results.push(result);
        }
        parentPort.postMessage({ type: "batchResult", data: results });
      }
    } catch (error) {
      parentPort.postMessage({
        type: "error",
        error: error.message,
        stack: error.stack,
      });
    }
  });
}
