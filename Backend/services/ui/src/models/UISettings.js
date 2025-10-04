import mongoose, { Schema } from "mongoose";

const UISettingsSchema = new Schema({
  orgId: { type: String, required: true, unique: true, index: true },
  logoUrl: { type: String },
  primaryColor: { type: String, default: "#8B5CF6" },
  secondaryColor: { type: String, default: "#3B82F6" },
  fontFamily: { type: String, default: "Inter, sans-serif" },
  theme: { type: String, enum: ["light", "dark"], default: "light" },
  featureFlags: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UISettingsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const UISettingsModel =
  mongoose.models.UISettings ||
  mongoose.model("UISettings", UISettingsSchema, "uiSettings");
