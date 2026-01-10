// BuildOS - MinIO client helper

import { Client } from "minio";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "minio";
const MINIO_PORT = Number(process.env.MINIO_PORT || "9000");
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "";
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === "true";
const MINIO_BUCKET = process.env.MINIO_BUCKET || "buildos-photos";
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || "";

if (!MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  console.warn("MinIO credentials are not set; photo uploads will fail.");
}

const client = new Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

export async function ensureBucket() {
  const exists = await client.bucketExists(MINIO_BUCKET).catch(() => false);
  if (!exists) {
    await client.makeBucket(MINIO_BUCKET, "us-east-1");
  }
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
      },
    ],
  };
  await client.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
  return MINIO_BUCKET;
}

export async function uploadBuffer(params: {
  objectName: string;
  buffer: Buffer;
  contentType?: string;
}) {
  const bucket = await ensureBucket();
  await client.putObject(
    bucket,
    params.objectName,
    params.buffer,
    params.buffer.length,
    {
      "Content-Type": params.contentType || "application/octet-stream",
    }
  );

  const baseUrl =
    MINIO_PUBLIC_URL ||
    `${MINIO_USE_SSL ? "https" : "http"}://${MINIO_ENDPOINT}:${MINIO_PORT}`;

  return `${baseUrl}/${bucket}/${params.objectName}`;
}
