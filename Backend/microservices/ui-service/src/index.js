import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectMongo } from "./config/db.js";
import { ensureCollections } from "./config/ensure.js";
import uiRoutes from "./routes/uiRoutes.js";

// Load environment variables
dotenv.config();

const PORT = Number(process.env.UI_SERVICE_PORT || 4006);

const app = express();
app.use(express.json());

// CORS (optional - typically handled by gateway)
const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({ origin: corsOrigins, credentials: true }));

// Health check (MUST be before other routes)
app.get("/health", (_req, res) => res.json({ ok: true, service: "ui" }));
app.get("/ui/health", (_req, res) => res.json({ ok: true, service: "ui" }));

// Routes
app.use("/ui", uiRoutes);

async function startUiService() {
  try {
    await connectMongo();
    console.log("✅ MongoDB connected");
    
    await ensureCollections();
    console.log("✅ Collections ensured");
    
    app.listen(PORT, () => {
      console.log(`🚀 [UI Service] listening on :${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start UI service:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startUiService();
}

export { app, startUiService };

