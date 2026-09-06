"use client";

import { pipeline } from "@xenova/transformers";

type BrowserEmbedder = (
  text: string,
  options: {
    pooling: "mean";
    normalize: true;
  },
) => Promise<{
  data: Float32Array | number[];
}>;

let embedderPromise: Promise<BrowserEmbedder> | null = null;

async function getEmbedder(): Promise<BrowserEmbedder> {
  if (!embedderPromise) {
    embedderPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      {
        quantized: true,
      },
    ) as unknown as Promise<BrowserEmbedder>;
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