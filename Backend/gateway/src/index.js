import express from "express";
import cors from "cors";
import httpProxy from "http-proxy";
import { env } from "../../src/config/env.js";

const app = express();

// Configure CORS to handle preflight requests properly
// NOTE: Do NOT use express.json() here as it consumes the body stream
// and the proxy won't have anything to forward
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle OPTIONS preflight requests for all routes
app.options("*", cors());

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

// Proxy error handler
proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err);
  if (!res.headersSent) {
    res.status(502).json({ error: "Bad Gateway", message: err.message });
  }
});

// Ensure CORS headers are preserved after proxying
proxy.on("proxyRes", (proxyRes, req, res) => {
  // The CORS middleware has already set headers, so we don't need to do anything special
  // Just log for debugging
  console.log(`[${req.method}] ${req.url} -> ${proxyRes.statusCode}`);
});

// Helper function for proxying
const proxyToService = (target, serviceName) => (req, res) => {
  console.log(`Proxying to ${serviceName}: ${req.method} ${req.url}`);
  proxy.web(req, res, { target });
};

// Auth service routes
app.all("/auth", proxyToService(targets.auth, "auth"));
app.all("/auth/*", proxyToService(targets.auth, "auth"));

// Org service routes
app.all("/org", proxyToService(targets.org, "org"));
app.all("/org/*", proxyToService(targets.org, "org"));

// User service routes
app.all("/users", proxyToService(targets.user, "user"));
app.all("/users/*", proxyToService(targets.user, "user"));

// File service routes
app.all("/files", proxyToService(targets.files, "files"));
app.all("/files/*", proxyToService(targets.files, "files"));

// Billing service routes
app.all("/billing", proxyToService(targets.billing, "billing"));
app.all("/billing/*", proxyToService(targets.billing, "billing"));

// UI service routes
app.all("/ui", proxyToService(targets.ui, "ui"));
app.all("/ui/*", proxyToService(targets.ui, "ui"));

app.get("/health", (_req, res) => res.json({ ok: true, services: targets }));

const GATEWAY_PORT = Number(process.env.PORT || 4000);
app.listen(GATEWAY_PORT, () =>
  console.log(`[gateway] listening on :${GATEWAY_PORT}`)
);
