import mongoose from "mongoose";

let isConnected = false;

export async function connectMongo() {
  if (isConnected) return mongoose.connection;
  
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || "CloudDock";
  
  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  
  await mongoose.connect(mongoUri, { dbName });
  isConnected = true;
  
  return mongoose.connection;
}

