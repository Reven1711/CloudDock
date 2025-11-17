import express from "express";
import {
  getAllUsers,
  getPendingUsers,
  getUserById,
  approveUser,
  rejectUser,
} from "../controllers/userController.js";

const router = express.Router();

// Get all users for an organization
router.get("/org/:tenantId", getAllUsers);

// Get pending users for an organization
router.get("/pending/:tenantId", getPendingUsers);

// Get user by ID (for checking approval status)
router.get("/:userId", getUserById);

// Approve a user
router.post("/:userId/approve", approveUser);

// Reject a user
router.post("/:userId/reject", rejectUser);

export default router;
