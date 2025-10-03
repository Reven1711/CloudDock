import mongoose from "mongoose";
import { env } from "../config/env.js";

let isConnected = false;

export async function connectMongo() {
  if (isConnected) return mongoose.connection;
  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName,
  });
  isConnected = true;
  return mongoose.connection;
}
