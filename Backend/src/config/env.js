import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the Backend root directory
const envPath = path.join(__dirname, "../../.env");
console.log("Looking for .env at:", envPath);

// Try to load .env file
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.log("Dotenv error:", result.error);
}

// Set environment variables directly if not loaded
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI =
    "mongodb+srv://cloudproject:jinil1711@cluster0.b3qxdyt.mongodb.net/CloudDock?retryWrites=true&w=majority";
  process.env.MONGODB_DB_NAME = "CloudDock";
  process.env.JWT_SECRET = "your-super-secret-jwt-key-here";
  process.env.NODE_ENV = "development";
  process.env.PORT = "4000";
  process.env.CORS_ORIGINS =
    "http://localhost:5173,http://localhost:3000,http://localhost:4173,http://localhost:8080";
  console.log("Set environment variables directly");
}

console.log("MONGODB_URI:", process.env.MONGODB_URI);
const required = (value, name) => {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    "http://localhost:5173,http://localhost:3000,http://localhost:4173,http://localhost:8080"
  ).split(","),
  mongodbUri: required(process.env.MONGODB_URI, "MONGODB_URI"),
  mongodbDbName: process.env.MONGODB_DB_NAME || "clouddock",
};
