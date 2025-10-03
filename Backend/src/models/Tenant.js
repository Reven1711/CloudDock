import mongoose, { Schema } from "mongoose";

const BrandingSchema = new Schema(
  {
    logoUrl: { type: String },
    primaryColor: { type: String, default: "#8B5CF6" },
    secondaryColor: { type: String, default: "#3B82F6" },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    fontFamily: { type: String, default: "Inter, sans-serif" },
  },
  { _id: false }
);

const FeaturesSchema = new Schema(
  {
    darkModeEnabled: { type: Boolean, default: true },
    multiLanguage: { type: [String], default: ["en"] },
    allowPublicSharing: { type: Boolean, default: true },
  },
  { _id: false }
);

const StorageSchema = new Schema(
  {
    usedInGB: { type: Number, default: 0 },
    limitInGB: { type: Number, default: 50 },
  },
  { _id: false }
);

const TenantSchema = new Schema({
  tenantId: { type: String, unique: true, index: true, required: true },
  companyName: { type: String, required: true },
  adminEmail: { type: String, required: true },
  branding: { type: BrandingSchema, default: () => ({}) },
  features: { type: FeaturesSchema, default: () => ({}) },
  storage: { type: StorageSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TenantSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const TenantModel =
  mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);
