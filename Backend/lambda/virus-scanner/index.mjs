/**
 * AWS Lambda Function for Virus Scanning
 * Uses ClamAV to scan files uploaded to S3
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const CALLBACK_URL = process.env.CALLBACK_URL;
const TMP_DIR = "/tmp";

/**
 * Download file from S3
 */
async function downloadFile(bucket, key) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  const chunks = [];

  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Scan file with ClamAV
 */
function scanWithClamAV(filePath) {
  try {
    // Run clamscan
    const output = execSync(`clamscan --no-summary ${filePath}`, {
      encoding: "utf-8",
    });

    console.log("ClamAV output:", output);

    // If no virus found, output contains "OK"
    if (output.includes("OK")) {
      return {
        status: "clean",
        threats: [],
      };
    }

    // Extract threat names
    const threats = [];
    const lines = output.split("\n");
    for (const line of lines) {
      if (line.includes("FOUND")) {
        const match = line.match(/:\s+(.*?)\s+FOUND/);
        if (match) {
          threats.push(match[1]);
        }
      }
    }

    return {
      status: "infected",
      threats,
    };
  } catch (error) {
    // ClamAV returns exit code 1 when virus is found
    if (error.status === 1) {
      console.log("Virus detected by ClamAV");
      const threats = [];
      const lines = error.stdout.split("\n");
      for (const line of lines) {
        if (line.includes("FOUND")) {
          const match = line.match(/:\s+(.*?)\s+FOUND/);
          if (match) {
            threats.push(match[1]);
          }
        }
      }

      return {
        status: "infected",
        threats,
      };
    }

    console.error("ClamAV error:", error);
    throw error;
  }
}

/**
 * Send scan result to callback URL
 */
async function sendCallback(fileId, status, threats = []) {
  if (!CALLBACK_URL) {
    console.log("No callback URL configured");
    return;
  }

  try {
    const payload = {
      fileId,
      status,
      threats,
      engine: "ClamAV",
      scannedAt: new Date().toISOString(),
    };

    const response = await fetch(CALLBACK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Callback failed:", await response.text());
    } else {
      console.log("Callback sent successfully");
    }
  } catch (error) {
    console.error("Callback error:", error);
  }
}

/**
 * Lambda handler
 */
export const handler = async (event) => {
  console.log("Virus scan event:", JSON.stringify(event));

  const { s3Key, fileId, bucket } = event;

  if (!s3Key || !fileId || !bucket) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing required parameters: s3Key, fileId, bucket",
      }),
    };
  }

  let filePath;

  try {
    // Ensure tmp directory exists
    mkdirSync(TMP_DIR, { recursive: true });

    // Download file from S3
    console.log(`Downloading file: ${s3Key} from bucket: ${bucket}`);
    const fileBuffer = await downloadFile(bucket, s3Key);

    // Save to tmp directory
    const fileName = s3Key.split("/").pop();
    filePath = join(TMP_DIR, fileName);
    writeFileSync(filePath, fileBuffer);
    console.log(`File saved to: ${filePath}`);

    // Scan with ClamAV
    console.log("Starting virus scan...");
    const scanResult = scanWithClamAV(filePath);
    console.log("Scan result:", scanResult);

    // Send callback
    await sendCallback(fileId, scanResult.status, scanResult.threats);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        fileId,
        status: scanResult.status,
        threats: scanResult.threats,
        message:
          scanResult.status === "clean" ? "File is clean" : "Virus detected",
      }),
    };
  } catch (error) {
    console.error("Virus scan error:", error);

    // Send error callback
    await sendCallback(fileId, "error", []);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Virus scan failed",
        message: error.message,
        fileId,
      }),
    };
  } finally {
    // Cleanup
    if (filePath) {
      try {
        unlinkSync(filePath);
        console.log("Cleanup completed");
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }
  }
};
