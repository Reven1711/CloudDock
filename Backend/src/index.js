import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectMongo } from "./db/connection.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: env.corsOrigins, credentials: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

export async function startServer() {
  await connectMongo();
  app.listen(env.port, () => {
    console.log(`API listening on :${env.port}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
