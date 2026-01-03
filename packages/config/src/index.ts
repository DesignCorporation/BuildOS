// BuildOS - Shared Configuration Package

export const APP_NAME = "BuildOS" as const;
export const APP_VERSION = "0.1.0" as const;

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
} as const;
