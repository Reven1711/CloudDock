import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { StoragePurchaseModel } from "../models/StoragePurchase.js";
import { OrganizationModel } from "../models/Organization.js";
import { StorageQuotaModel } from "../models/StorageQuota.js";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const PRICE_PER_GB = 0.2; // $0.20 per GB per month
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Create a Stripe checkout session for storage purchase
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { orgId, storageGB } = req.body;

    if (!orgId || !storageGB || storageGB <= 0) {
      return res.status(400).json({
        error: "Missing or invalid parameters: orgId and storageGB required",
      });
    }

    // Ensure minimum purchase meets Stripe's $0.50 minimum
    const minStorageGB = 3; // 3 GB * $0.20 = $0.60 (meets Stripe minimum)
    if (storageGB < minStorageGB) {
      return res.status(400).json({
        error: `Minimum storage purchase is ${minStorageGB} GB`,
        minimum: minStorageGB,
      });
    }

    // Check if organization exists
    const organization = await OrganizationModel.findOne({ orgId });
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const priceUSD = storageGB * PRICE_PER_GB;
    const purchaseId = uuidv4();

    console.log("🔧 Creating Stripe checkout session...");
    console.log("   - FRONTEND_URL:", FRONTEND_URL);

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `CloudDock Storage - ${storageGB} GB`,
              description: `Additional ${storageGB} GB storage for 1 month`,
            },
            unit_amount: Math.round(priceUSD * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/admin/dashboard?payment=cancelled`,
      metadata: {
        purchaseId,
        orgId,
        storageGB: storageGB.toString(),
        priceUSD: priceUSD.toString(),
      },
    });

    // Create pending purchase record
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // Expires after 1 month

    const purchase = new StoragePurchaseModel({
      purchaseId,
      orgId,
      storageGB,
      priceUSD,
      stripeSessionId: session.id,
      status: "pending",
      expiresAt,
    });

    await purchase.save();

    console.log("✅ Checkout session created successfully!");
    console.log("   - Session ID:", session.id);
    console.log("   - Checkout URL:", session.url);

    res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      purchaseId,
    });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    res.status(500).json({
      error: "Failed to create checkout session",
      message: error.message,
    });
  }
};

/**
 * Handle Stripe webhook events
 */
export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await handleSuccessfulPayment(session);
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        await handleSuccessfulPayment(session);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        await handleFailedPayment(session);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(session) {
  const { purchaseId, orgId, storageGB } = session.metadata;

  // Update purchase record
  const purchase = await StoragePurchaseModel.findOne({ purchaseId });
  if (!purchase) {
    console.error(`Purchase not found: ${purchaseId}`);
    return;
  }

  purchase.status = "completed";
  purchase.stripePaymentIntentId = session.payment_intent;
  await purchase.save();

  // Update organization storage quota (in GB)
  const organization = await OrganizationModel.findOne({ orgId });
  if (!organization) {
    console.error(`Organization not found: ${orgId}`);
    return;
  }

  organization.quota += parseFloat(storageGB);
  await organization.save();

  // Update StorageQuota model (in bytes) - This is what the frontend reads!
  console.log(`🔍 [WEBHOOK] Looking for StorageQuota for orgId: ${orgId}`);
  let storageQuota = await StorageQuotaModel.findOne({ orgId });

  console.log(
    `📊 [WEBHOOK] StorageQuota before update:`,
    storageQuota
      ? {
          totalQuota: storageQuota.totalQuota,
          totalQuotaGB: (
            storageQuota.totalQuota /
            (1024 * 1024 * 1024)
          ).toFixed(2),
        }
      : "NOT FOUND"
  );

  if (!storageQuota) {
    // Create if doesn't exist
    console.log(`⚠️  [WEBHOOK] StorageQuota not found, creating new one...`);
    storageQuota = new StorageQuotaModel({
      orgId,
      totalQuota: 1024 * 1024 * 1024, // 1 GB default
      usedStorage: 0,
      fileCount: 0,
      isPaidPlan: false,
      paidStorageGB: 0,
    });
  }

  // Add purchased storage in bytes (1 GB = 1024 * 1024 * 1024 bytes)
  const storageBytes = parseFloat(storageGB) * 1024 * 1024 * 1024;
  console.log(
    `➕ [WEBHOOK] Adding ${storageGB} GB (${storageBytes} bytes) to quota`
  );
  storageQuota.totalQuota += storageBytes;
  storageQuota.paidStorageGB += parseFloat(storageGB);
  storageQuota.isPaidPlan = true;
  await storageQuota.save();

  console.log(`📊 [WEBHOOK] StorageQuota after update:`, {
    totalQuota: storageQuota.totalQuota,
    totalQuotaGB: (storageQuota.totalQuota / (1024 * 1024 * 1024)).toFixed(2),
    paidStorageGB: storageQuota.paidStorageGB,
  });

  console.log(
    `✅ Storage upgrade successful: ${orgId} +${storageGB} GB (New quota: ${organization.quota} GB / ${storageQuota.totalQuota} bytes)`
  );
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(session) {
  const { purchaseId } = session.metadata;

  const purchase = await StoragePurchaseModel.findOne({ purchaseId });
  if (!purchase) {
    console.error(`Purchase not found: ${purchaseId}`);
    return;
  }

  purchase.status = "failed";
  await purchase.save();

  console.log(`❌ Payment failed for purchase: ${purchaseId}`);
}

/**
 * Get storage purchase history for an organization
 */
export const getPurchaseHistory = async (req, res) => {
  try {
    const { orgId } = req.params;

    const purchases = await StoragePurchaseModel.find({ orgId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      purchases: purchases.map((p) => ({
        purchaseId: p.purchaseId,
        storageGB: p.storageGB,
        priceUSD: p.priceUSD,
        status: p.status,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get purchase history error:", error);
    res.status(500).json({
      error: "Failed to get purchase history",
      message: error.message,
    });
  }
};

/**
 * Manually sync all completed purchases to storage quota
 * This checks for completed purchases and ensures they're applied to the organization's storage
 */
export const syncPurchasesToStorage = async (req, res) => {
  try {
    const { orgId } = req.params;

    console.log(`🔄 [SYNC] Starting storage sync for orgId: ${orgId}`);

    // Get all completed purchases for this organization
    const completedPurchases = await StoragePurchaseModel.find({
      orgId,
      status: "completed",
    }).sort({ createdAt: 1 });

    console.log(
      `📊 [SYNC] Found ${completedPurchases.length} completed purchases`
    );

    if (completedPurchases.length === 0) {
      return res.json({
        success: true,
        message: "No completed purchases to sync",
        purchasesProcessed: 0,
      });
    }

    // Get current storage quota
    let storageQuota = await StorageQuotaModel.findOne({ orgId });

    if (!storageQuota) {
      console.log(`⚠️  [SYNC] StorageQuota not found, creating new one...`);
      storageQuota = new StorageQuotaModel({
        orgId,
        totalQuota: 1024 * 1024 * 1024, // 1 GB default
        usedStorage: 0,
        fileCount: 0,
        isPaidPlan: false,
        paidStorageGB: 0,
      });
    }

    console.log(`📊 [SYNC] Current storage quota:`, {
      totalQuota: storageQuota.totalQuota,
      totalQuotaGB: (storageQuota.totalQuota / (1024 * 1024 * 1024)).toFixed(
        2
      ),
      paidStorageGB: storageQuota.paidStorageGB,
    });

    // Calculate total purchased storage from all completed purchases
    const totalPurchasedGB = completedPurchases.reduce(
      (sum, p) => sum + parseFloat(p.storageGB),
      0
    );

    // Calculate what should be the correct total
    const baseStorageGB = 1; // 1 GB base
    const correctTotalGB = baseStorageGB + totalPurchasedGB;
    const correctTotalBytes = correctTotalGB * 1024 * 1024 * 1024;

    console.log(`📊 [SYNC] Storage calculation:`, {
      baseStorageGB,
      totalPurchasedGB,
      correctTotalGB,
      currentTotalGB: (
        storageQuota.totalQuota /
        (1024 * 1024 * 1024)
      ).toFixed(2),
    });

    // Update storage quota to the correct total
    storageQuota.totalQuota = correctTotalBytes;
    storageQuota.paidStorageGB = totalPurchasedGB;
    storageQuota.isPaidPlan = totalPurchasedGB > 0;
    await storageQuota.save();

    // Also update Organization model
    const organization = await OrganizationModel.findOne({ orgId });
    if (organization) {
      organization.quota = correctTotalGB;
      await organization.save();
      console.log(`✅ [SYNC] Updated Organization quota to ${correctTotalGB} GB`);
    }

    console.log(`✅ [SYNC] Storage quota synced successfully:`, {
      totalQuota: storageQuota.totalQuota,
      totalQuotaGB: (storageQuota.totalQuota / (1024 * 1024 * 1024)).toFixed(
        2
      ),
      paidStorageGB: storageQuota.paidStorageGB,
      purchasesProcessed: completedPurchases.length,
    });

    res.json({
      success: true,
      message: "Storage quota synced successfully",
      purchasesProcessed: completedPurchases.length,
      totalPurchasedGB,
      newTotalGB: correctTotalGB,
      newTotalQuota: storageQuota.totalQuota,
    });
  } catch (error) {
    console.error("❌ [SYNC] Sync purchases error:", error);
    res.status(500).json({
      error: "Failed to sync purchases to storage",
      message: error.message,
    });
  }
};

/**
 * Complete a payment manually (for development without webhooks)
 * This retrieves the session from Stripe and completes the purchase
 */
export const completePayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: "Missing sessionId",
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return res.status(400).json({
        error: "Payment not completed",
        status: session.payment_status,
      });
    }

    // Get metadata
    const { purchaseId, orgId, storageGB } = session.metadata;

    // Check if already completed
    const purchase = await StoragePurchaseModel.findOne({ purchaseId });
    if (!purchase) {
      return res.status(404).json({
        error: "Purchase record not found",
      });
    }

    if (purchase.status === "completed") {
      return res.json({
        success: true,
        message: "Payment already completed",
        alreadyCompleted: true,
      });
    }

    // Update purchase record
    purchase.status = "completed";
    purchase.stripePaymentIntentId = session.payment_intent;
    await purchase.save();

    // Update organization storage quota (in GB)
    const organization = await OrganizationModel.findOne({ orgId });
    if (!organization) {
      return res.status(404).json({
        error: "Organization not found",
      });
    }

    organization.quota += parseFloat(storageGB);
    await organization.save();

    // Update StorageQuota model (in bytes) - This is what the frontend reads!
    console.log(`🔍 Looking for StorageQuota for orgId: ${orgId}`);
    let storageQuota = await StorageQuotaModel.findOne({ orgId });

    console.log(
      `📊 StorageQuota before update:`,
      storageQuota
        ? {
            totalQuota: storageQuota.totalQuota,
            totalQuotaGB: (
              storageQuota.totalQuota /
              (1024 * 1024 * 1024)
            ).toFixed(2),
          }
        : "NOT FOUND"
    );

    if (!storageQuota) {
      // Create if doesn't exist
      console.log(`⚠️  StorageQuota not found, creating new one...`);
      storageQuota = new StorageQuotaModel({
        orgId,
        totalQuota: 1024 * 1024 * 1024, // 1 GB default
        usedStorage: 0,
        fileCount: 0,
        isPaidPlan: false,
        paidStorageGB: 0,
      });
    }

    // Add purchased storage in bytes (1 GB = 1024 * 1024 * 1024 bytes)
    const storageBytes = parseFloat(storageGB) * 1024 * 1024 * 1024;
    console.log(`➕ Adding ${storageGB} GB (${storageBytes} bytes) to quota`);
    storageQuota.totalQuota += storageBytes;
    storageQuota.paidStorageGB += parseFloat(storageGB);
    storageQuota.isPaidPlan = true;
    await storageQuota.save();

    console.log(`📊 StorageQuota after update:`, {
      totalQuota: storageQuota.totalQuota,
      totalQuotaGB: (storageQuota.totalQuota / (1024 * 1024 * 1024)).toFixed(2),
      paidStorageGB: storageQuota.paidStorageGB,
    });

    console.log(
      `✅ Storage upgrade completed: ${orgId} +${storageGB} GB (New quota: ${organization.quota} GB / ${storageQuota.totalQuota} bytes)`
    );

    res.json({
      success: true,
      message: "Storage upgraded successfully",
      storageAdded: parseFloat(storageGB),
      newQuota: storageQuota.totalQuota, // Return bytes
      newQuotaGB: storageQuota.totalQuota / (1024 * 1024 * 1024), // Return GB for display
    });
  } catch (error) {
    console.error("Complete payment error:", error);
    res.status(500).json({
      error: "Failed to complete payment",
      message: error.message,
    });
  }
};

