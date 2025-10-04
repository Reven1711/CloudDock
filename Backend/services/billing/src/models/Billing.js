import mongoose, { Schema } from "mongoose";

const BillingSchema = new Schema({
  billingId: { type: String, required: true, unique: true, index: true },
  orgId: { type: String, required: true, index: true },
  storageUsed: { type: Number, default: 0 }, // GB
  limit: { type: Number, default: 50 }, // GB
  amountDue: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["none", "due", "paid"],
    default: "none",
  },
  lastBilledAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

BillingSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const BillingModel =
  mongoose.models.Billing ||
  mongoose.model("Billing", BillingSchema, "billing");
