import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectMongo } from "./config/db.js";
import { ensureCollections } from "./config/ensure.js";
import authRoutes from "./routes/authRoutes.js";

// Load environment variables
dotenv.config();

const PORT = Number(process.env.AUTH_SERVICE_PORT || 4001);

const app = express();
app.use(express.json());

// CORS (optional - typically handled by gateway)
const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({ origin: corsOrigins, credentials: true }));

// Health check (MUST be before other routes)
app.get("/health", (_req, res) => res.json({ ok: true, service: "auth" }));
app.get("/auth/health", (_req, res) => res.json({ ok: true, service: "auth" }));

// Routes
app.use("/auth", authRoutes);

async function startAuthService() {
  try {
    await connectMongo();
    console.log("✅ MongoDB connected");
    
    await ensureCollections();
    console.log("✅ Collections ensured");
    
    app.listen(PORT, () => {
      console.log(`🚀 [Auth Service] listening on :${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start auth service:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startAuthService();
}

export { app, startAuthService };

