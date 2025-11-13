import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectMongo } from "./config/db.js";
import { ensureCollections } from "./config/ensure.js";
import orgRoutes from "./routes/orgRoutes.js";

// Load environment variables
dotenv.config();

const PORT = Number(process.env.ORG_SERVICE_PORT || 4002);

const app = express();
app.use(express.json());

// CORS (optional - typically handled by gateway)
const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({ origin: corsOrigins, credentials: true }));

// Health check (MUST be before other routes)
app.get("/health", (_req, res) => res.json({ ok: true, service: "org" }));
app.get("/org/health", (_req, res) => res.json({ ok: true, service: "org" }));

// Routes
app.use("/org", orgRoutes);

async function startOrgService() {
  try {
    await connectMongo();
    console.log("✅ MongoDB connected");
    
    await ensureCollections();
    console.log("✅ Collections ensured");
    
    app.listen(PORT, () => {
      console.log(`🚀 [Org Service] listening on :${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start org service:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startOrgService();
}

export { app, startOrgService };

