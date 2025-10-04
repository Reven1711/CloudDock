import express from "express";
import cors from "cors";
import { connectMongo } from "../../../src/db/connection.js";
import { ensureCollections } from "../../../src/db/ensure.js";
import { env } from "../../../src/config/env.js";

const PORT = Number(process.env.AUTH_SERVICE_PORT || 4001);

const app = express();
app.use(express.json());
app.use(cors({ origin: env.corsOrigins, credentials: true }));

// Routes (placeholders)
app.post("/auth/org/signup", (_req, res) => res.json({ ok: true }));
app.post("/auth/user/signup", (_req, res) => res.json({ ok: true }));
app.post("/auth/login", (_req, res) => res.json({ ok: true, token: "mock" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startAuthService() {
  await connectMongo();
  await ensureCollections("auth");
  app.listen(PORT, () => console.log(`[auth] listening on :${PORT}`));
}

if (process.env.NODE_ENV !== "test") {
  startAuthService();
}
