import express from "express";
import {
  getOrganizations,
  getOrganization,
} from "../controllers/orgController.js";

const router = express.Router();

router.get("/", getOrganizations);
router.get("/:tenantId", getOrganization);

export default router;
