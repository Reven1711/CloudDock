import mongoose, { Schema } from "mongoose";

const FileSchema = new Schema({
  fileId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
    unique: true,
  },
  s3Bucket: {
    type: String,
    required: true,
  },
  orgId: {
    type: String,
    required: true,
    index: true,
  },
  uploadedBy: {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
  },
  folder: {
    type: String,
    default: "/",
  },
  virusScanStatus: {
    type: String,
    enum: ["pending", "scanning", "clean", "infected", "error"],
    default: "pending",
  },
  virusScanResult: {
    scannedAt: Date,
    engine: String,
    threats: [String],
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
FileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
FileSchema.index({ orgId: 1, isDeleted: 1 });
FileSchema.index({ uploadedBy: 1, isDeleted: 1 });
FileSchema.index({ virusScanStatus: 1 });
FileSchema.index({ createdAt: -1 });

export const FileModel =
  mongoose.models.File || mongoose.model("File", FileSchema, "files");
