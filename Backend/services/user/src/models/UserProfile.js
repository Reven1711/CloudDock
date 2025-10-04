import mongoose, { Schema } from "mongoose";

const UserProfileSchema = new Schema({
  userId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String },
  preferences: { type: Schema.Types.Mixed, default: {} },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserProfileSchema.index({ userId: 1, orgId: 1 }, { unique: true });

UserProfileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const UserProfileModel =
  mongoose.models.UserProfile ||
  mongoose.model("UserProfile", UserProfileSchema, "userProfiles");
