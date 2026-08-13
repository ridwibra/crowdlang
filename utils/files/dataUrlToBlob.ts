// utils/files/dataUrlToBlob.ts
type DataURI = `data:${string}`;

export default function dataURItoBlob(dataURI: string | DataURI): Blob | null {
  if (!dataURI || typeof dataURI !== "string") return null;
  if (!dataURI.startsWith("data:")) return null;

  const [header, data] = dataURI.split(",", 2);
  if (!header || !data) return null;

  const isBase64 = header.includes("base64");
  const mimeMatch = header.match(/^data:([^;]+)/);
  if (!mimeMatch) return null;
  const mimeString = mimeMatch[1];

  let byteArray: Uint8Array;

  try {
    if (isBase64) {
      const raw =
        typeof atob === "function"
          ? atob(data)
          : Buffer.from(data, "base64").toString("binary");

      byteArray = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        byteArray[i] = raw.charCodeAt(i);
      }
    } else {
      const raw = decodeURIComponent(data);
      byteArray = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        byteArray[i] = raw.charCodeAt(i);
      }
    }
  } catch {
    return null;
  }

  // FIX: Cast to BlobPart for cross-platform compatibility
  return new Blob([byteArray as unknown as BlobPart], { type: mimeString });
}
