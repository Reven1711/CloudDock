import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const PlatformAdminSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: "Platform Administrator",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to update timestamp
PlatformAdminSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Method to verify password
PlatformAdminSchema.methods.verifyPassword = async function (password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Static method to find by email
PlatformAdminSchema.statics.findByEmail = async function (email) {
  return await this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Static method to create or update admin
PlatformAdminSchema.statics.createOrUpdateAdmin = async function (email, password, name = "Platform Administrator") {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const admin = await this.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      name,
      isActive: true,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
  
  return admin;
};

// Static method to initialize default admin
PlatformAdminSchema.statics.initializeDefaultAdmin = async function () {
  const defaultEmail = process.env.PLATFORM_ADMIN_EMAIL || "admin@clouddock.com";
  const defaultPassword = process.env.PLATFORM_ADMIN_PASSWORD || "admin123";
  const defaultName = "Platform Administrator";

  // Check if admin already exists
  const existingAdmin = await this.findOne({ email: defaultEmail });
  
  if (!existingAdmin) {
    // Create default admin
    await this.createOrUpdateAdmin(defaultEmail, defaultPassword, defaultName);
    console.log(`✅ Default platform admin created: ${defaultEmail}`);
  } else {
    // Update password if environment variable is set (for password changes)
    if (process.env.PLATFORM_ADMIN_PASSWORD) {
      await this.createOrUpdateAdmin(defaultEmail, defaultPassword, defaultName);
      console.log(`✅ Platform admin password updated: ${defaultEmail}`);
    } else {
      console.log(`ℹ️  Platform admin already exists: ${defaultEmail}`);
    }
  }
};

export const PlatformAdminModel =
  mongoose.models.PlatformAdmin ||
  mongoose.model("PlatformAdmin", PlatformAdminSchema);

