import express from "express";
import cors from "cors";
import { connectMongo } from "../../../src/db/connection.js";
import { ensureCollections } from "../../../src/db/ensure.js";
import { env } from "../../../src/config/env.js";
import userRoutes from "./routes/userRoutes.js";

const PORT = Number(process.env.USER_SERVICE_PORT || 4003);

const app = express();
app.use(express.json());
// CORS is handled by the gateway, not needed here
// app.use(cors({ origin: env.corsOrigins, credentials: true }));

// User routes
app.use("/users", userRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startUserService() {
  await connectMongo();
  await ensureCollections("user");
  app.listen(PORT, () => console.log(`[user] listening on :${PORT}`));
}

if (process.env.NODE_ENV !== "test") {
  startUserService();
}
