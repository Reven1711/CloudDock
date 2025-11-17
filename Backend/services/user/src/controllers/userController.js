import { AuthUserModel } from "../../../auth/src/models/User.js";

export const getAllUsers = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const users = await AuthUserModel.find(
      { tenantId },
      { userId: 1, name: 1, email: 1, role: 1, status: 1, createdAt: 1, _id: 0 }
    ).sort({ createdAt: -1 });

    res.json({
      success: true,
      users: users.map((user) => ({
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        approved: user.status === "active",
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPendingUsers = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const users = await AuthUserModel.find(
      { tenantId, status: "pending" },
      { userId: 1, name: 1, email: 1, role: 1, createdAt: 1, _id: 0 }
    ).sort({ createdAt: -1 });

    res.json({
      success: true,
      users: users.map((user) => ({
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await AuthUserModel.findOne(
      { userId },
      { userId: 1, name: 1, email: 1, role: 1, status: 1, tenantId: 1, createdAt: 1, _id: 0 }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        approved: user.status === "active",
        tenantId: user.tenantId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await AuthUserModel.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.status === "active") {
      return res.status(400).json({ error: "User is already approved" });
    }

    user.status = "active";
    await user.save();

    res.json({
      success: true,
      message: "User approved successfully",
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        approved: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await AuthUserModel.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete the user from database
    await AuthUserModel.deleteOne({ userId });

    res.json({
      success: true,
      message: "User rejected and removed",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
