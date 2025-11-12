import express from "express";
import {
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../controllers/userController.js";

const router = express.Router();

// Get all users for an organization
router.get("/org/:tenantId", getAllUsers);

// Get pending users for an organization
router.get("/pending/:tenantId", getPendingUsers);

// Approve a user
router.post("/:userId/approve", approveUser);

// Reject a user
router.post("/:userId/reject", rejectUser);

export default router;
