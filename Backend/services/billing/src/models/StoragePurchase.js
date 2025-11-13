import mongoose, { Schema } from "mongoose";

const StoragePurchaseSchema = new Schema({
  purchaseId: { type: String, required: true, unique: true, index: true },
  orgId: { type: String, required: true, index: true },
  storageGB: { type: Number, required: true }, // Amount of storage purchased in GB
  priceUSD: { type: Number, required: true }, // Price paid in USD
  stripeSessionId: { type: String, required: true, unique: true },
  stripePaymentIntentId: { type: String },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  expiresAt: { type: Date, required: true }, // Storage expires after 1 month
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

StoragePurchaseSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const StoragePurchaseModel =
  mongoose.models.StoragePurchase ||
  mongoose.model("StoragePurchase", StoragePurchaseSchema, "storage_purchases");
