// utils/embeddings.ts
"use client";

import { pipeline, env } from "@huggingface/transformers";

// Transformers.js should run in the browser.
// Do not try to use local Node models.
env.allowLocalModels = false;
env.allowRemoteModels = true;

let extractorPromise: Promise<any> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
    );
  }

  return extractorPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new Error("Cannot create an embedding from empty text.");
  }

  const extractor = await getExtractor();

  const output = await extractor(cleanedText, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data as Float32Array);

  if (embedding.length !== 384) {
    throw new Error(
      `Unexpected embedding dimension: ${embedding.length}. Expected 384.`,
    );
  }

  return embedding;
}
