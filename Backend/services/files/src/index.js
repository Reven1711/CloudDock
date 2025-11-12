import express from "express";
import cors from "cors";
import { connectMongo } from "../../../src/db/connection.js";
import { ensureCollections } from "../../../src/db/ensure.js";
import { env } from "../../../src/config/env.js";

const PORT = Number(process.env.FILE_SERVICE_PORT || 4004);

const app = express();
app.use(express.json());
// CORS is handled by the gateway, not needed here
// app.use(cors({ origin: env.corsOrigins, credentials: true }));

// File routes (placeholders)
app.post("/files/upload", (_req, res) => res.json({ ok: true }));
app.get("/files/:id", (_req, res) => res.json({ ok: true }));
app.delete("/files/:id", (_req, res) => res.json({ ok: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startFileService() {
  await connectMongo();
  await ensureCollections("files");
  app.listen(PORT, () => console.log(`[files] listening on :${PORT}`));
}

if (process.env.NODE_ENV !== "test") {
  startFileService();
}
