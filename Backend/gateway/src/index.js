import express from "express";
import cors from "cors";
import httpProxy from "http-proxy";
import { env } from "../../src/config/env.js";

const app = express();
app.use(cors({ origin: env.corsOrigins, credentials: true }));

const proxy = httpProxy.createProxyServer({ changeOrigin: true });

const targets = {
  auth:
    process.env.AUTH_SERVICE_URL ||
    `http://localhost:${process.env.AUTH_SERVICE_PORT || 4001}`,
  org:
    process.env.ORG_SERVICE_URL ||
    `http://localhost:${process.env.ORG_SERVICE_PORT || 4002}`,
  user:
    process.env.USER_SERVICE_URL ||
    `http://localhost:${process.env.USER_SERVICE_PORT || 4003}`,
  files:
    process.env.FILE_SERVICE_URL ||
    `http://localhost:${process.env.FILE_SERVICE_PORT || 4004}`,
  billing:
    process.env.BILLING_SERVICE_URL ||
    `http://localhost:${process.env.BILLING_SERVICE_PORT || 4005}`,
  ui:
    process.env.UI_SERVICE_URL ||
    `http://localhost:${process.env.UI_SERVICE_PORT || 4006}`,
};

app.all("/auth/*", (req, res) => proxy.web(req, res, { target: targets.auth }));
app.all("/org/*", (req, res) => proxy.web(req, res, { target: targets.org }));
app.all("/users/*", (req, res) =>
  proxy.web(req, res, { target: targets.user })
);
app.all("/files/*", (req, res) =>
  proxy.web(req, res, { target: targets.files })
);
app.all("/billing/*", (req, res) =>
  proxy.web(req, res, { target: targets.billing })
);
app.all("/ui/*", (req, res) => proxy.web(req, res, { target: targets.ui }));

app.get("/health", (_req, res) => res.json({ ok: true, services: targets }));

const GATEWAY_PORT = Number(process.env.PORT || 4000);
app.listen(GATEWAY_PORT, () =>
  console.log(`[gateway] listening on :${GATEWAY_PORT}`)
);
