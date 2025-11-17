import express from "express";
import cors from "cors";
import httpProxy from "http-proxy";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS
const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:8080,http://localhost:5173")
  .split(",")
  .map(origin => origin.trim()); // Trim whitespace

console.log("🔐 CORS Origins configured:", corsOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      if (corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Content-Length", "Content-Type"],
    maxAge: 86400, // 24 hours
  })
);

// Handle OPTIONS preflight requests explicitly
app.options("*", cors());

const proxy = httpProxy.createProxyServer({ changeOrigin: true });

// Service targets
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

// Log proxied responses
proxy.on("proxyRes", (proxyRes, req, res) => {
  console.log(`[${req.method}] ${req.url} -> ${proxyRes.statusCode}`);
});

// Helper function for proxying
const proxyToService = (target, serviceName) => (req, res) => {
  console.log(`Proxying to ${serviceName}: ${req.method} ${req.url}`);
  proxy.web(req, res, { target });
};

// Route definitions
app.all("/auth", proxyToService(targets.auth, "auth"));
app.all("/auth/*", proxyToService(targets.auth, "auth"));

app.all("/org", proxyToService(targets.org, "org"));
app.all("/org/*", proxyToService(targets.org, "org"));

app.all("/users", proxyToService(targets.user, "user"));
app.all("/users/*", proxyToService(targets.user, "user"));

app.all("/files", proxyToService(targets.files, "files"));
app.all("/files/*", proxyToService(targets.files, "files"));

app.all("/billing", proxyToService(targets.billing, "billing"));
app.all("/billing/*", proxyToService(targets.billing, "billing"));

app.all("/ui", proxyToService(targets.ui, "ui"));
app.all("/ui/*", proxyToService(targets.ui, "ui"));

// Health check
app.get("/health", (_req, res) => res.json({ ok: true, services: targets }));

const GATEWAY_PORT = Number(process.env.PORT || 4000);
app.listen(GATEWAY_PORT, () =>
  console.log(`🚀 [Gateway] listening on :${GATEWAY_PORT}`)
);

