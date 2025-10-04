import mongoose, { Schema } from "mongoose";

const PermissionsSchema = new Schema(
  {
    sharedWith: { type: [String], default: [] }, // userIds
    publicLink: { type: String },
  },
  { _id: false }
);

const FileSchema = new Schema({
  fileId: { type: String, required: true, unique: true, index: true },
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  s3Key: { type: String, required: true },
  sizeInMB: { type: Number, required: true },
  mimeType: { type: String, required: true },
  permissions: { type: PermissionsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

FileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const ServiceFileModel =
  mongoose.models.ServiceFile ||
  mongoose.model("ServiceFile", FileSchema, "files");
