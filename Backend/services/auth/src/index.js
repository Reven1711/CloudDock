import express from "express";
import cors from "cors";
import { connectMongo } from "../../../src/db/connection.js";
import { ensureCollections } from "../../../src/db/ensure.js";
import { env } from "../../../src/config/env.js";
import authRoutes from "./routes/authRoutes.js";

const PORT = Number(process.env.AUTH_SERVICE_PORT || 4001);

const app = express();
app.use(express.json());
// CORS is handled by the gateway, not needed here
// app.use(cors({ origin: env.corsOrigins, credentials: true }));

// Routes
app.use("/auth", authRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startAuthService() {
  await connectMongo();
  await ensureCollections("auth");
  app.listen(PORT, () => console.log(`[auth] listening on :${PORT}`));
}

if (process.env.NODE_ENV !== "test") {
  startAuthService();
}
