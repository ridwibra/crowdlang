"use client";

import React, { useState } from "react";

type SourceType =
  | "alphabet"
  | "essay"
  | "language"
  | "language-fallback"
  | "reel"
  | "table"
  | "table-reverse";

type RAGDocument = {
  sourceType: SourceType;
  sourceId: string;
  text: string;
  language: string;
};

export default function AdminPage() {
  const [status, setStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const runIngest = async () => {
    setLoading(true);

    setStatus("Loading CrowdLang content…");

    try {
      /*
       * Step 1:
       * Get the documents from the server.
       */
      const response = await fetch("/api/crowdrag/ingest", {
        method: "POST",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !Array.isArray(data.documents)) {
        throw new Error(data.message || "Could not load content for indexing.");
      }

      const documents = data.documents as RAGDocument[];

      if (documents.length === 0) {
        throw new Error("There is no CrowdLang content to index.");
      }

      /*
       * IMPORTANT:
       *
       * Transformers.js is loaded dynamically in
       * the browser rather than at module load time.
       */
      setStatus("Loading the browser AI embedding model…");

      const { embedText } = await import("@/utils/embeddings");

      const items: Array<
        RAGDocument & {
          embedding: number[];
        }
      > = [];

      /*
       * Step 2:
       * Generate embeddings in the browser.
       */
      for (let index = 0; index < documents.length; index += 1) {
        const document = documents[index];

        setStatus(
          `Generating embeddings: ${index + 1} of ${documents.length}…`,
        );

        const embedding = await embedText(document.text);

        items.push({
          ...document,
          embedding,
        });
      }

      /*
       * Step 3:
       * Save the completed index.
       */
      setStatus("Saving the new RAG index…");

      const saveResponse = await fetch("/api/crowdrag/save-index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
        }),
      });

      const saveData = await saveResponse.json().catch(() => ({}));

      if (!saveResponse.ok) {
        throw new Error(saveData.message || "Could not save RAG index.");
      }

      setStatus(
        `✅ RAG index rebuilt successfully! ${saveData.indexedCount} items indexed.`,
      );
    } catch (error) {
      console.error("RAG ingest error:", error);

      const message =
        error instanceof Error ? error.message : "Unknown indexing error.";

      setStatus(`❌ Ingest failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">CrowdLang Admin</h1>

      <button
        type="button"
        onClick={runIngest}
        disabled={loading}
        className="rounded bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Rebuilding RAG Index…" : "Rebuild RAG Index"}
      </button>

      {status && (
        <div className="rounded border bg-gray-50 p-3 text-sm">{status}</div>
      )}
    </div>
  );
}
