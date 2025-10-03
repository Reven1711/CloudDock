import mongoose, { Schema } from "mongoose";

const ActivityLogSchema = new Schema({
  tenantId: { type: String, index: true, required: true },
  userId: { type: String, index: true, required: true },
  action: {
    type: String,
    enum: ["login", "upload", "delete", "share", "download", "approve_user"],
    required: true,
  },
  targetId: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export const ActivityLogModel =
  mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
