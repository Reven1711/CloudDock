import express from "express";
import cors from "cors";
import { connectMongo } from "../../../src/db/connection.js";
import { env } from "../../../src/config/env.js";

const PORT = Number(process.env.ORG_SERVICE_PORT || 4002);

const app = express();
app.use(express.json());
app.use(cors({ origin: env.corsOrigins, credentials: true }));

// Org routes (placeholders)
app.post("/org", (_req, res) => res.json({ ok: true }));
app.get("/org/:tenantId", (_req, res) => res.json({ ok: true }));
app.patch("/org/:tenantId", (_req, res) => res.json({ ok: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startOrgService() {
  await connectMongo();
  app.listen(PORT, () => console.log(`[org] listening on :${PORT}`));
}

if (process.env.NODE_ENV !== "test") {
  startOrgService();
}
