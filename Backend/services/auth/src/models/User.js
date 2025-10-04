import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, index: true },
  passwordHash: { type: String, required: true },
  tenantId: { type: String, required: true }, // orgId
  role: { type: String, enum: ["admin", "user", "viewer"], default: "user" },
  status: { type: String, enum: ["pending", "active"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

UserSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const AuthUserModel =
  mongoose.models.AuthUser || mongoose.model("AuthUser", UserSchema, "users");
