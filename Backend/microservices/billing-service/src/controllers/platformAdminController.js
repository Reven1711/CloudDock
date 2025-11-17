import jwt from "jsonwebtoken";
import { PlatformAdminModel } from "../models/PlatformAdmin.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

/**
 * Platform admin login
 * This is separate from organization admin login
 */
export const platformAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find platform admin in database
    const admin = await PlatformAdminModel.findByEmail(email);
    
    if (!admin) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Platform admin email not found",
      });
    }

    // Verify password
    const isValid = await admin.verifyPassword(password);
    if (!isValid) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Incorrect password",
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT with platform-admin role
    const token = jwt.sign(
      {
        userId: admin._id.toString(),
        email: admin.email,
        name: admin.name,
        role: "platform-admin",
        isPlatformAdmin: true,
      },
      JWT_SECRET,
      { expiresIn: "24h" } // Platform admin tokens expire in 24 hours
    );

    console.log(`✅ Platform admin logged in: ${admin.email}`);

    res.json({
      success: true,
      token,
      user: {
        userId: admin._id.toString(),
        email: admin.email,
        name: admin.name,
        role: "platform-admin",
        isPlatformAdmin: true,
      },
      message: "Platform admin login successful",
    });
  } catch (error) {
    console.error("Platform admin login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: error.message,
    });
  }
};

/**
 * Verify platform admin token (for frontend)
 */
export const verifyPlatformAdminToken = async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        valid: false,
        error: "No token provided",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "platform-admin" && decoded.role !== "super-admin") {
      return res.status(403).json({
        valid: false,
        error: "Not a platform admin",
      });
    }

    res.json({
      valid: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        isPlatformAdmin: true,
      },
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      error: "Invalid or expired token",
      message: error.message,
    });
  }
};

/**
 * Get all platform admins (requires platform admin auth)
 */
export const getAllPlatformAdmins = async (req, res) => {
  try {
    const admins = await PlatformAdminModel.find({ isActive: true })
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      admins: admins.map((admin) => ({
        id: admin._id,
        email: admin.email,
        name: admin.name,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get platform admins error:", error);
    res.status(500).json({
      error: "Failed to retrieve platform admins",
      message: error.message,
    });
  }
};

/**
 * Create a new platform admin (requires platform admin auth)
 */
export const createPlatformAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const admin = await PlatformAdminModel.createOrUpdateAdmin(
      email,
      password,
      name || "Platform Administrator"
    );

    console.log(`✅ Platform admin created/updated: ${admin.email}`);

    res.json({
      success: true,
      message: "Platform admin created successfully",
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    console.error("Create platform admin error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Platform admin with this email already exists",
      });
    }
    res.status(500).json({
      error: "Failed to create platform admin",
      message: error.message,
    });
  }
};

