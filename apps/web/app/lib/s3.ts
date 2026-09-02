import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const AVATAR_BUCKET = process.env.S3_BUCKET || "avatars";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const ext = EXTENSIONS[contentType] || "bin";
  const key = `avatars/${userId}/${randomUUID()}.${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: AVATAR_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${S3_ENDPOINT}/${AVATAR_BUCKET}/${key}`;
}
