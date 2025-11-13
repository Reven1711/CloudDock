import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectMongo } from "./config/db.js";
import { ensureCollections } from "./config/ensure.js";
import billingRoutes from "./routes/billingRoutes.js";

// Load environment variables
dotenv.config();

const PORT = Number(process.env.BILLING_SERVICE_PORT || 4005);

const app = express();

// Webhook route needs raw body, so it's registered before JSON middleware
app.use("/billing/webhook", express.raw({ type: "application/json" }));

// JSON middleware for other routes
app.use(express.json());

// CORS (optional - typically handled by gateway)
const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({ origin: corsOrigins, credentials: true }));

// Health check (MUST be before other routes)
app.get("/health", (_req, res) => res.json({ ok: true, service: "billing" }));
app.get("/billing/health", (_req, res) => res.json({ ok: true, service: "billing" }));

// Routes
app.use("/billing", billingRoutes);

async function startBillingService() {
  try {
    await connectMongo();
    console.log("✅ MongoDB connected");
    
    await ensureCollections();
    console.log("✅ Collections ensured");
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("⚠️  WARNING: STRIPE_SECRET_KEY not set - payment features will not work");
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 [Billing Service] listening on :${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start billing service:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startBillingService();
}

export { app, startBillingService };

