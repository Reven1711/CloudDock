import express from "express";
import {
  orgSignup,
  userSignup,
  signin,
  logout,
  verifyToken,
} from "../controllers/authController.js";
import { AuthUserModel } from "../models/User.js";

const router = express.Router();

router.post("/org/signup", orgSignup);
router.post("/user/signup", userSignup);
router.post("/login", signin);
router.post("/logout", logout);

// Protected routes
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await AuthUserModel.findOne({ userId: req.user.userId });

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
        orgId: user.tenantId,
        approved: user.status === "active",
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

