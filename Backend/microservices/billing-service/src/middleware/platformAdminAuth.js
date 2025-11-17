import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

/**
 * Middleware to verify platform admin (super admin) access
 * Platform admins are different from organization admins
 * Only platform admins can modify system-wide configurations like pricing
 */
export const verifyPlatformAdmin = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Access denied. No token provided.",
        message: "Platform admin authentication required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user has platform admin role
    // Platform admins have role: "platform-admin" or "super-admin"
    // Organization admins have role: "admin" (these should NOT have access)
    if (decoded.role !== "platform-admin" && decoded.role !== "super-admin") {
      return res.status(403).json({
        error: "Access denied. Platform admin privileges required.",
        message: "Only platform administrators can modify system configurations.",
        userRole: decoded.role,
      });
    }

    req.platformAdmin = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      error: "Invalid or expired token.",
      message: error.message,
    });
  }
};

