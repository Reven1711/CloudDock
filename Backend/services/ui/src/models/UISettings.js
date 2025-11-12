import mongoose, { Schema } from "mongoose";

const UISettingsSchema = new Schema({
  orgId: { type: String, required: true, unique: true, index: true },
  logoUrl: { type: String },
  primaryColor: { type: String, default: "#6366f1" },
  secondaryColor: { type: String, default: "#8b5cf6" },
  accentColor: { type: String, default: "#ec4899" },
  fontFamily: { type: String, default: "Inter, sans-serif" },
  theme: { type: String, enum: ["light", "dark"], default: "dark" },
  cardStyle: {
    type: String,
    enum: ["glassmorphism", "neumorphism"],
    default: "glassmorphism",
  },
  showAnalytics: { type: Boolean, default: true },
  showRecentFiles: { type: Boolean, default: true },
  fileViewLayout: {
    type: String,
    enum: ["large-icons", "list", "details", "tiles"],
    default: "large-icons",
  },
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
