import "dotenv/config";
const required = (value, name) => {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173").split(","),
  mongodbUri: required(process.env.MONGODB_URI, "MONGODB_URI"),
  mongodbDbName: process.env.MONGODB_DB_NAME || "clouddock",
};
