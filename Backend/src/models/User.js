import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  tenantId: { type: String, index: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "editor", "viewer"],
    default: "viewer",
  },
  status: {
    type: String,
    enum: ["pending", "active", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

UserSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const UserModel =
  mongoose.models.User || mongoose.model("User", UserSchema);
