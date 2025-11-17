import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Platform admin credentials (should be in environment variables in production)
// In production, these should be stored securely and not in code
const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || "admin@clouddock.com";
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "admin123"; // CHANGE IN PRODUCTION!

// Hash the password on startup (in production, use a pre-hashed password)
let PLATFORM_ADMIN_PASSWORD_HASH = null;

// Initialize password hash
(async () => {
  if (PLATFORM_ADMIN_PASSWORD_HASH === null) {
    PLATFORM_ADMIN_PASSWORD_HASH = await bcrypt.hash(PLATFORM_ADMIN_PASSWORD, 10);
    console.log("🔐 Platform admin authentication initialized");
  }
})();

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

    // Verify platform admin credentials
    if (email !== PLATFORM_ADMIN_EMAIL) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Platform admin email not found",
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, PLATFORM_ADMIN_PASSWORD_HASH);
    if (!isValid) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Incorrect password",
      });
    }

    // Generate JWT with platform-admin role
    const token = jwt.sign(
      {
        userId: "platform-admin",
        email: PLATFORM_ADMIN_EMAIL,
        role: "platform-admin",
        isPlatformAdmin: true,
      },
      JWT_SECRET,
      { expiresIn: "24h" } // Platform admin tokens expire in 24 hours
    );

    console.log(`✅ Platform admin logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        userId: "platform-admin",
        email: PLATFORM_ADMIN_EMAIL,
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

