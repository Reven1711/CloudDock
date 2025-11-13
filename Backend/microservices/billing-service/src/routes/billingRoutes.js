import express from "express";
import {
  createCheckoutSession,
  handleWebhook,
  getPurchaseHistory,
  completePayment,
} from "../controllers/stripeController.js";

const router = express.Router();

// Create Stripe checkout session for storage purchase
router.post("/storage/checkout", createCheckoutSession);

// Complete payment manually (for development without webhooks)
router.post("/storage/complete", completePayment);

// Get purchase history for an organization
router.get("/storage/history/:orgId", getPurchaseHistory);

// Stripe webhook endpoint (must use raw body)
// Note: This route should be before express.json() middleware
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

export default router;

