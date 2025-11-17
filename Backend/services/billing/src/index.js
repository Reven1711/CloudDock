import express from "express";
import cors from "cors";
import { connectMongo } from "../../../src/db/connection.js";
import { ensureCollections } from "../../../src/db/ensure.js";
import { env } from "../../../src/config/env.js";
import billingRoutes from "./routes/billingRoutes.js";
import { SystemConfigModel } from "./models/SystemConfig.js";

const PORT = Number(process.env.BILLING_SERVICE_PORT || 4005);

const app = express();

// Webhook route needs raw body, so it's registered before JSON middleware
app.use("/billing/webhook", express.raw({ type: "application/json" }));

// JSON middleware for other routes
app.use(express.json());
// CORS is handled by the gateway, not needed here
// app.use(cors({ origin: env.corsOrigins, credentials: true }));

// Billing routes
app.use("/billing", billingRoutes);

// Legacy routes (placeholders)
app.get("/billing/usage/:tenantId", (_req, res) => res.json({ ok: true }));
app.post("/billing/notify/:tenantId", (_req, res) => res.json({ ok: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startBillingService() {
  await connectMongo();
  await ensureCollections("billing");
  
  // Initialize default system configurations
  await SystemConfigModel.initializeDefaults();
  
  app.listen(PORT, () => console.log(`[billing] listening on :${PORT}`));
}

if (process.env.NODE_ENV !== "test") {
  startBillingService();
}
