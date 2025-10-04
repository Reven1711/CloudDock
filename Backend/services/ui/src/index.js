import express from "express";
import cors from "cors";
import { connectMongo } from "../../../src/db/connection.js";
import { ensureCollections } from "../../../src/db/ensure.js";
import { env } from "../../../src/config/env.js";

const PORT = Number(process.env.UI_SERVICE_PORT || 4006);

const app = express();
app.use(express.json());
app.use(cors({ origin: env.corsOrigins, credentials: true }));

// UI customization routes (placeholders)
app.get("/ui/:tenantId", (_req, res) => res.json({ ok: true }));
app.patch("/ui/:tenantId", (_req, res) => res.json({ ok: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startUiService() {
  await connectMongo();
  await ensureCollections("ui");
  app.listen(PORT, () => console.log(`[ui] listening on :${PORT}`));
}

if (process.env.NODE_ENV !== "test") {
  startUiService();
}
