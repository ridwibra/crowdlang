// utils/files/requests.ts
type CloudinaryResponse = {
  url: string;
  public_id: string;
};

type CloudinaryError = {
  message: string;
};

type CloudinaryDeleteResponse = {
  success: boolean;
};

const DEFAULT_TIMEOUT_MS = 180_000;

const withTimeout = (ms = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeout),
  };
};

export const uploadMedia = async (
  files: (File | Blob)[] | File | Blob,
  path?: string
): Promise<CloudinaryResponse[]> => {
  const formData = new FormData();
  const filesArray = Array.isArray(files) ? files : [files];

  for (const file of filesArray) {
    formData.append("files", file as any);
  }

  if (path) {
    formData.append("path", path);
  }

  const { signal, cleanup } = withTimeout();

  try {
    const response = await fetch("/api/cloudinary", {
      method: "POST",
      body: formData,
      signal,
    });

  let payload: unknown;

try {
  payload = await response.json();
} catch {
  if (response.status === 413) {
    throw new Error(
      "Your file is too large for the upload service. Compress it or choose a smaller file, then try again.",
    );
  }

  if (response.status === 415) {
    throw new Error(
      "The upload service does not support this file format. Try MP4 for video or MP3 for audio.",
    );
  }

  if (response.status === 408 || response.status === 504) {
    throw new Error(
      "The upload request timed out. Please try again or choose a smaller file.",
    );
  }

  if (response.status >= 500) {
    throw new Error(
      "The upload service encountered a server error. Please try again shortly.",
    );
  }

  throw new Error(
    `The upload service returned an unexpected response (HTTP ${response.status}). Please try again.`,
  );
}

if (!response.ok) {
  const error = payload as CloudinaryError | null;

  const serverMessage =
    typeof error?.message === "string" ? error.message.trim() : "";

  if (serverMessage) {
    throw new Error(serverMessage);
  }

  if (response.status === 413) {
    throw new Error(
      "Your file is too large for the upload service. Compress it or choose a smaller file, then try again.",
    );
  }

  if (response.status === 415) {
    throw new Error(
      "The upload service does not support this file format. Try MP4 for video or MP3 for audio.",
    );
  }

  throw new Error(
    `The upload could not be completed (HTTP ${response.status}). Please try again.`,
  );
}

    return payload as CloudinaryResponse[];
  } finally {
    cleanup();
  }
};

export const deleteMedia = async (
  public_id: string
): Promise<CloudinaryDeleteResponse> => {
  const { signal, cleanup } = withTimeout();

  try {
    const response = await fetch("/api/cloudinary", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ public_id }),
      signal,
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Delete failed: invalid server response");
    }

    if (!response.ok) {
      const error = payload as CloudinaryError;
      throw new Error(error.message || "Delete failed");
    }

    return payload as CloudinaryDeleteResponse;
  } finally {
    cleanup();
  }
};
