import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { FileModel } from "../models/File.js";
import {
  LAMBDA_FUNCTION_NAME,
  ENABLE_VIRUS_SCAN,
  s3Config,
} from "../config/aws.js";

// Lambda Client
const lambdaClient = new LambdaClient(s3Config);

/**
 * Scan file for viruses using AWS Lambda
 */
export const scanFileForVirus = async (fileId, s3Key) => {
  try {
    if (!ENABLE_VIRUS_SCAN) {
      console.log("Virus scanning is disabled");
      // Mark as clean if scanning is disabled
      await updateVirusScanStatus(fileId, "clean", null);
      return { status: "clean" };
    }

    // Update status to scanning
    await updateVirusScanStatus(fileId, "scanning", null);

    // Prepare Lambda payload
    const payload = {
      s3Key,
      fileId,
      bucket: process.env.S3_BUCKET_NAME,
    };

    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      InvocationType: "Event", // Asynchronous invocation
      Payload: JSON.stringify(payload),
    });

    await lambdaClient.send(command);

    console.log(`Virus scan initiated for file: ${fileId}`);
    return { status: "scanning" };
  } catch (error) {
    console.error("Virus scan error:", error);
    // Mark as error if scan fails
    await updateVirusScanStatus(fileId, "error", {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Update virus scan status for a file
 */
export const updateVirusScanStatus = async (
  fileId,
  status,
  scanResult = null
) => {
  try {
    const file = await FileModel.findOne({ fileId });

    if (!file) {
      throw new Error("File not found");
    }

    file.virusScanStatus = status;

    if (scanResult) {
      file.virusScanResult = {
        scannedAt: new Date(),
        engine: scanResult.engine || "ClamAV",
        threats: scanResult.threats || [],
      };
    }

    await file.save();
    return file;
  } catch (error) {
    console.error("Update virus scan status error:", error);
    throw error;
  }
};

/**
 * Handle virus scan webhook/callback from Lambda
 */
export const handleVirusScanCallback = async (req, res) => {
  try {
    const { fileId, status, threats = [], engine = "ClamAV" } = req.body;

    if (!fileId || !status) {
      return res.status(400).json({
        error: "Missing required fields: fileId, status",
      });
    }

    const scanResult = {
      engine,
      threats,
    };

    await updateVirusScanStatus(fileId, status, scanResult);

    res.json({
      success: true,
      message: "Virus scan status updated",
      fileId,
      status,
    });
  } catch (error) {
    console.error("Handle virus scan callback error:", error);
    res.status(500).json({
      error: "Failed to process scan callback",
      message: error.message,
    });
  }
};

/**
 * Get virus scan status for a file
 */
export const getVirusScanStatus = async (fileId) => {
  try {
    const file = await FileModel.findOne({ fileId });

    if (!file) {
      throw new Error("File not found");
    }

    return {
      fileId: file.fileId,
      fileName: file.fileName,
      virusScanStatus: file.virusScanStatus,
      virusScanResult: file.virusScanResult,
    };
  } catch (error) {
    console.error("Get virus scan status error:", error);
    throw error;
  }
};

