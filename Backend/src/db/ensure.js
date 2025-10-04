import mongoose from "mongoose";

const serviceCollections = {
  auth: ["users"],
  org: ["organizations"],
  user: ["userProfiles"],
  files: ["files"],
  billing: ["billing"],
  ui: ["uiSettings"],
};

export async function ensureCollections(serviceKey) {
  const conn = mongoose.connection;
  const existing = await conn.db.listCollections().toArray();
  const existingNames = new Set(existing.map((c) => c.name));
  const wanted = serviceCollections[serviceKey] || [];
  for (const name of wanted) {
    if (!existingNames.has(name)) {
      await conn.db.createCollection(name);
    }
  }
}
