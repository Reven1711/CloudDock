import mongoose, { Schema } from "mongoose";

const PermissionSchema = new Schema(
  {
    userId: { type: String, required: true },
    canRead: { type: Boolean, default: true },
    canWrite: { type: Boolean, default: false },
    canShare: { type: Boolean, default: false },
  },
  { _id: false }
);

const FileSchema = new Schema({
  tenantId: { type: String, index: true, required: true },
  ownerId: { type: String, index: true, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  s3Key: { type: String, required: true, unique: true },
  version: { type: Number, default: 1 },
  isPublic: { type: Boolean, default: false },
  publicExpiresAt: { type: Date },
  permissions: { type: [PermissionSchema], default: () => [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

FileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const FileModel =
  mongoose.models.File || mongoose.model("File", FileSchema);
