// utils/files/cloudinary.ts

import { v2 as cloudinary } from "cloudinary";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

if (
  !process.env.CLOUDINARY_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Cloudinary configuration is missing.");
}

export type CloudinaryUploadResult = {
  url: string;
  public_id: string;
};

type CloudinaryResourceType = "image" | "video" | "raw";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const VIDEO_EXTENSIONS = [
  "mp4",
  "webm",
  "mov",
  "ogv",
  "avi",
];

const AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
  "oga",
  "flac",
];

const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
];

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");

  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function getResourceType(file: File): CloudinaryResourceType {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  if (
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    VIDEO_EXTENSIONS.includes(extension) ||
    AUDIO_EXTENSIONS.includes(extension)
  ) {
    /*
     * Cloudinary uses resource_type: "video" for both videos and audio.
     */
    return "video";
  }

  if (
    mimeType.startsWith("image/") ||
    IMAGE_EXTENSIONS.includes(extension)
  ) {
    return "image";
  }

  return "raw";
}

export const uploadToCloudinary = async (
  file: File,
  path?: string,
): Promise<CloudinaryUploadResult> => {
  const buffer = Buffer.from(await file.arrayBuffer());

  const extension = getFileExtension(file.name);
  const temporaryFileName = `upload_${randomUUID()}${
    extension ? `.${extension}` : ""
  }`;

  const temporaryFilePath = join(tmpdir(), temporaryFileName);

  await fs.writeFile(temporaryFilePath, buffer);

  try {
    const result = await cloudinary.uploader.upload(temporaryFilePath, {
      folder: path || "uploads",
      resource_type: getResourceType(file),
      invalidate: true,
      timeout: 180_000,
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } finally {
    await fs.unlink(temporaryFilePath).catch(() => {});
  }
};

export const deleteFromCloudinary = async (
  publicId: string,
): Promise<void> => {
  /*
   * Your application stores avatars/images, videos, and audio.
   * Audio and video are Cloudinary resource_type "video".
   *
   * Try each possible resource type so existing assets uploaded under
   * your older "raw" audio configuration can still be deleted.
   */
  const resourceTypes: CloudinaryResourceType[] = [
    "image",
    "video",
    "raw",
  ];

  for (const resourceType of resourceTypes) {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    if (result?.result === "ok") {
      return;
    }
  }

  throw new Error("Cloudinary media was not found or could not be deleted.");
};