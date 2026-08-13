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
      throw new Error("Upload failed: invalid server response");
    }

    if (!response.ok) {
      const error = payload as CloudinaryError;
      throw new Error(error.message || "Upload failed");
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
