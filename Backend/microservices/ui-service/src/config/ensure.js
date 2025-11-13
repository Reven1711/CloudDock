import mongoose from "mongoose";

export async function ensureCollections() {
  const conn = mongoose.connection;
  const existing = await conn.db.listCollections().toArray();
  const existingNames = new Set(existing.map((c) => c.name));
  
  const requiredCollections = ["uiSettings"];
  
  for (const name of requiredCollections) {
    if (!existingNames.has(name)) {
      await conn.db.createCollection(name);
      console.log(`✅ Created collection: ${name}`);
    }
  }
}

