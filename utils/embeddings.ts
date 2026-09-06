// utils/embeddings.ts
import "server-only";

type Embedder = (
  text: string,
  options: {
    pooling: "mean";
    normalize: true;
  },
) => Promise<{
  data: Float32Array | number[];
}>;

let embedderPromise: Promise<Embedder> | null = null;

async function getEmbedder(): Promise<Embedder> {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");

      const extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        {
          quantized: true,
        },
      );

      return extractor as unknown as Embedder;
    })();
  }

  return embedderPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const cleanedText = text.replace(/\s+/g, " ").trim();

  if (!cleanedText) {
    throw new Error("Cannot create an embedding from empty text.");
  }

  const embedder = await getEmbedder();

  const output = await embedder(cleanedText, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));

  return dot / (normA * normB + 1e-8);
}