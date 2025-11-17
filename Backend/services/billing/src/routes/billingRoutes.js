import express from "express";
import {
  createCheckoutSession,
  handleWebhook,
  getPurchaseHistory,
  completePayment,
  syncPurchasesToStorage,
} from "../controllers/stripeController.js";
import {
  getAllConfigurations,
  getConfigurationsByCategory,
  getConfiguration,
  updateConfiguration,
  getPricing,
} from "../controllers/configController.js";
import { verifyPlatformAdmin } from "../middleware/platformAdminAuth.js";
import {
  platformAdminLogin,
  verifyPlatformAdminToken,
} from "../controllers/platformAdminController.js";

const router = express.Router();

// Create Stripe checkout session for storage purchase
router.post("/storage/checkout", createCheckoutSession);

// Complete payment manually (for development without webhooks)
router.post("/storage/complete", completePayment);

// Manually sync all completed purchases to storage quota
router.post("/storage/sync/:orgId", syncPurchasesToStorage);

// Get purchase history for an organization
router.get("/storage/history/:orgId", getPurchaseHistory);

// Get pricing information (public - customers need to see this)
router.get("/pricing", getPricing);

// Platform admin authentication endpoints
router.post("/platform-admin/login", platformAdminLogin);
router.get("/platform-admin/verify", verifyPlatformAdminToken);

// System configuration endpoints (PLATFORM ADMIN ONLY)
// Organization admins (role: "admin") cannot access these
// Only platform admins (role: "platform-admin" or "super-admin") can
router.get("/config", verifyPlatformAdmin, getAllConfigurations);
router.get("/config/category/:category", verifyPlatformAdmin, getConfigurationsByCategory);
router.get("/config/:key", verifyPlatformAdmin, getConfiguration);
router.put("/config/:key", verifyPlatformAdmin, updateConfiguration);

// Stripe webhook endpoint (must use raw body)
// Note: This route should be before express.json() middleware
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

export default router;
