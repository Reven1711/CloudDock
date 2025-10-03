import express from "express";
import cors from "cors";
import { connectMongo } from "../../../src/db/connection.js";
import { env } from "../../../src/config/env.js";

const PORT = Number(process.env.USER_SERVICE_PORT || 4003);

const app = express();
app.use(express.json());
app.use(cors({ origin: env.corsOrigins, credentials: true }));

// User routes (placeholders)
app.post("/users", (_req, res) => res.json({ ok: true }));
app.get("/users/pending/:tenantId", (_req, res) => res.json({ ok: true }));
app.post("/users/:userId/approve", (_req, res) => res.json({ ok: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startUserService() {
  await connectMongo();
  app.listen(PORT, () => console.log(`[user] listening on :${PORT}`));
}

if (process.env.NODE_ENV !== "test") {
  startUserService();
}
