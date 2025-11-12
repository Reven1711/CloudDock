import express from "express";
import {
  getUISettings,
  updateUISettings,
} from "../controllers/uiController.js";

const router = express.Router();

router.get("/:tenantId", getUISettings);
router.patch("/:tenantId", updateUISettings);

export default router;
