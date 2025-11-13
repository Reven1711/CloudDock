import mongoose, { Schema } from "mongoose";

const OrganizationSchema = new Schema({
  orgId: { type: String, required: true, unique: true, index: true },
  orgName: { type: String, required: true },
  adminEmail: { type: String, required: true },
  logo: { type: String },
  theme: { type: String, enum: ["light", "dark"], default: "light" },
  quota: { type: Number, default: 50 }, // GB
  usedStorage: { type: Number, default: 0 }, // GB
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

OrganizationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const OrganizationModel =
  mongoose.models.Organization ||
  mongoose.model("Organization", OrganizationSchema, "organizations");

