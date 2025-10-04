import express from "express";
import cors from "cors";
import { connectMongo } from "../../../src/db/connection.js";
import { ensureCollections } from "../../../src/db/ensure.js";
import { env } from "../../../src/config/env.js";

const PORT = Number(process.env.BILLING_SERVICE_PORT || 4005);

const app = express();
app.use(express.json());
app.use(cors({ origin: env.corsOrigins, credentials: true }));

// Billing routes (placeholders)
app.get("/billing/usage/:tenantId", (_req, res) => res.json({ ok: true }));
app.post("/billing/notify/:tenantId", (_req, res) => res.json({ ok: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startBillingService() {
  await connectMongo();
  await ensureCollections("billing");
  app.listen(PORT, () => console.log(`[billing] listening on :${PORT}`));
}

if (process.env.NODE_ENV !== "test") {
  startBillingService();
}
