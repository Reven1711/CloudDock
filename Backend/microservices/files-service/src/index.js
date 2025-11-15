import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";
import { connectMongo } from "./config/db.js";
import { ensureCollections } from "./config/ensure.js";
import fileRoutes from "./routes/fileRoutes.js";
import { initializeWorkerPool, getWorkerPool } from "./utils/workerPool.js";

// Load environment variables
dotenv.config();

const PORT = Number(process.env.FILE_SERVICE_PORT || 4004);

const app = express();
app.use(express.json());

// CORS (optional - typically handled by gateway)
const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(
  ","
);
app.use(cors({ origin: corsOrigins, credentials: true }));

// Health check (MUST be before other routes)
app.get("/health", (_req, res) => {
  const workerPool = getWorkerPool();
  const poolStats = workerPool.getStats();

  res.json({
    ok: true,
    service: "files",
    workerPool: {
      initialized: workerPool.initialized,
      workers: poolStats,
      cpuCores: os.cpus().length,
    },
  });
});
app.get("/files/health", (_req, res) =>
  res.json({ ok: true, service: "files" })
);

// Routes
app.use("/files", fileRoutes);

let server;

async function startFileService() {
  try {
    // Step 1: Connect to MongoDB
    await connectMongo();
    console.log("✅ MongoDB connected");

    // Step 2: Ensure collections
    await ensureCollections();
    console.log("✅ Collections ensured");

    // Step 3: Initialize Worker Pool for parallel file processing
    console.log("🔧 Initializing Worker Pool...");
    await initializeWorkerPool({
      awsRegion: process.env.AWS_REGION,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      mongoUri: process.env.MONGODB_URI,
    });
    console.log("✅ Worker Pool initialized");

    // Step 4: Start server
    server = app.listen(PORT, () => {
      console.log(`🚀 [Files Service] listening on :${PORT}`);
      console.log(`   - Single file upload: POST /files/upload`);
      console.log(`   - Batch upload (parallel): POST /files/upload/batch`);
      console.log(`   - Custom parallelism: POST /files/upload/parallel`);
      console.log(`   - Worker pool stats: GET /files/worker-pool/stats`);
    });
  } catch (error) {
    console.error("❌ Failed to start files service:", error);
    await gracefulShutdown();
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log("\n🛑 Shutting down gracefully...");

  try {
    // Close HTTP server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log("✅ HTTP server closed");
    }

    // Terminate worker pool
    const workerPool = getWorkerPool();
    if (workerPool.initialized) {
      await workerPool.terminate();
      console.log("✅ Worker pool terminated");
    }

    // Close MongoDB connection
    await require("mongoose").connection.close();
    console.log("✅ MongoDB connection closed");

    console.log("✅ Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

if (process.env.NODE_ENV !== "test") {
  startFileService();
}

export { app, startFileService };
