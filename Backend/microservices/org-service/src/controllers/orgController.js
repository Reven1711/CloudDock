import { OrganizationModel } from "../models/Organization.js";

export const getOrganizations = async (req, res) => {
  try {
    const orgs = await OrganizationModel.find(
      {},
      { orgId: 1, orgName: 1, _id: 0 }
    );
    res.json({ success: true, organizations: orgs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrganization = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const org = await OrganizationModel.findOne({ orgId: tenantId });
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }
    res.json({ success: true, organization: org });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

