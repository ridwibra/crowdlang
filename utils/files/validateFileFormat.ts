// utils/files/validateFileFormat.ts
type UploadFile = {
  mimetype: string;
  size: number;
  name?: string;
};

type ValidationResult = {
  valid: boolean;
  message?: string;
};

const ALLOWED_IMAGE_FORMATS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

const ALLOWED_VIDEO_FORMATS = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/ogg",
  "video/x-msvideo",
] as const;

const ALLOWED_AUDIO_FORMATS = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
] as const;

const ALLOWED_DOCUMENT_FORMATS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
];

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

const DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

const MAX_IMAGES = 5;

function getFileExtension(fileName = "") {
  const parts = fileName.toLowerCase().split(".");

  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function isImage(file: UploadFile) {
  return (
    file.mimetype.startsWith("image/") ||
    IMAGE_EXTENSIONS.includes(getFileExtension(file.name))
  );
}

function isVideo(file: UploadFile) {
  return (
    file.mimetype.startsWith("video/") ||
    VIDEO_EXTENSIONS.includes(getFileExtension(file.name))
  );
}

function isAudio(file: UploadFile) {
  return (
    file.mimetype.startsWith("audio/") ||
    AUDIO_EXTENSIONS.includes(getFileExtension(file.name))
  );
}

function isDocument(file: UploadFile) {
  return (
    file.mimetype.startsWith("application/") ||
    DOCUMENT_EXTENSIONS.includes(getFileExtension(file.name))
  );
}

export const validateMediaFiles = async (
  files: UploadFile[],
): Promise<ValidationResult> => {
  if (!files || files.length === 0) {
    return {
      valid: false,
      message: "No files were chosen.",
    };
  }

  const imageCount = files.filter(isImage).length;

  if (imageCount > MAX_IMAGES) {
    return {
      valid: false,
      message: `Too many images. Maximum ${MAX_IMAGES} allowed.`,
    };
  }

  for (const file of files) {
    const mimeType = file.mimetype.toLowerCase();
    const extension = getFileExtension(file.name);

    if (isImage(file)) {
      const validMime =
        !mimeType ||
        mimeType === "application/octet-stream" ||
        ALLOWED_IMAGE_FORMATS.includes(mimeType as never);

      const validExtension = IMAGE_EXTENSIONS.includes(extension);

      if (!validMime && !validExtension) {
        return {
          valid: false,
          message: "Unsupported image format.",
        };
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return {
          valid: false,
          message: "Image size exceeds 10 MB.",
        };
      }

      continue;
    }

    if (isVideo(file)) {
      const validMime =
        !mimeType ||
        mimeType === "application/octet-stream" ||
        ALLOWED_VIDEO_FORMATS.includes(mimeType as never);

      const validExtension = VIDEO_EXTENSIONS.includes(extension);

      if (!validMime && !validExtension) {
        return {
          valid: false,
          message: "Unsupported video format.",
        };
      }

      if (file.size > MAX_VIDEO_SIZE) {
        return {
          valid: false,
          message: "Video size exceeds 200 MB.",
        };
      }

      continue;
    }

    if (isAudio(file)) {
      const validMime =
        !mimeType ||
        mimeType === "application/octet-stream" ||
        ALLOWED_AUDIO_FORMATS.includes(mimeType as never);

      const validExtension = AUDIO_EXTENSIONS.includes(extension);

      if (!validMime && !validExtension) {
        return {
          valid: false,
          message: "Unsupported audio format.",
        };
      }

      if (file.size > MAX_AUDIO_SIZE) {
        return {
          valid: false,
          message: "Audio size exceeds 20 MB.",
        };
      }

      continue;
    }

    if (isDocument(file)) {
      const validMime =
        !mimeType ||
        mimeType === "application/octet-stream" ||
        ALLOWED_DOCUMENT_FORMATS.includes(mimeType as never);

      const validExtension = DOCUMENT_EXTENSIONS.includes(extension);

      if (!validMime && !validExtension) {
        return {
          valid: false,
          message: "Unsupported document format.",
        };
      }

      if (file.size > MAX_DOCUMENT_SIZE) {
        return {
          valid: false,
          message: "Document exceeds 5 MB.",
        };
      }

      continue;
    }

    return {
      valid: false,
      message: "Unsupported file type.",
    };
  }

  return {
    valid: true,
  };
};