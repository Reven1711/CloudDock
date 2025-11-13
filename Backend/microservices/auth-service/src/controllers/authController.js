import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthUserModel } from "../models/User.js";
import { OrganizationModel } from "../models/Organization.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const orgSignup = async (req, res) => {
  try {
    const { orgName, adminName, adminEmail, password } = req.body;
    const orgId = orgName.toLowerCase().replace(/\s+/g, "-");

    // Check if org exists
    const existingOrg = await OrganizationModel.findOne({ orgId });
    if (existingOrg) {
      return res.status(400).json({ error: "Organization already exists" });
    }

    // Create organization
    const org = new OrganizationModel({
      orgId,
      orgName,
      adminEmail,
      quota: 50,
      usedStorage: 0,
    });
    await org.save();

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = new AuthUserModel({
      userId: `admin_${orgId}_${Date.now()}`,
      name: adminName,
      email: adminEmail,
      passwordHash: hashedPassword,
      tenantId: orgId,
      role: "admin",
      status: "active",
    });
    await adminUser.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: adminUser.userId, orgId, role: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        userId: adminUser.userId,
        name: adminName,
        email: adminEmail,
        role: "admin",
        orgId,
        approved: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const userSignup = async (req, res) => {
  try {
    const { orgId, name, email, password } = req.body;

    // Check if org exists
    const org = await OrganizationModel.findOne({ orgId });
    if (!org) {
      return res.status(400).json({ error: "Organization not found" });
    }

    // Check if user already exists
    const existingUser = await AuthUserModel.findOne({
      email,
      tenantId: orgId,
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User already exists in this organization" });
    }

    // Create pending user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new AuthUserModel({
      userId: `user_${orgId}_${Date.now()}`,
      name,
      email,
      passwordHash: hashedPassword,
      tenantId: orgId,
      role: "user",
      status: "pending",
    });
    await user.save();

    // Generate JWT (even for pending users)
    const token = jwt.sign(
      { userId: user.userId, orgId, role: "user" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name,
        email,
        role: "user",
        orgId,
        approved: false,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const signin = async (req, res) => {
  try {
    const { email, password, orgId } = req.body;

    // Find user
    const user = await AuthUserModel.findOne({ email, tenantId: orgId });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.userId, orgId, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.tenantId,
        approved: user.status === "active",
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const logout = async (req, res) => {
  // JWT tokens are stateless, so logout is handled client-side
  res.json({ success: true, message: "Logged out successfully" });
};

// Middleware to verify JWT token
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

