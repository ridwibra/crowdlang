"use client";

import React, { useState } from "react";
import { embedText } from "@/utils/embeddings";

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
      const response = await fetch("/api/crowdrag/ingest", {
        method: "POST",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !Array.isArray(data.documents)) {
        throw new Error(data.message || "Could not load content for indexing.");
      }

      const documents = data.documents as RAGDocument[];
      const items: Array<RAGDocument & { embedding: number[] }> = [];

      for (let index = 0; index < documents.length; index += 1) {
        const document = documents[index];

        setStatus(
          `Loading free browser AI model / embedding ${index + 1} of ${documents.length}…`,
        );

        const embedding = await embedText(document.text);

        items.push({
          ...document,
          embedding,
        });
      }

      setStatus("Saving the new RAG index…");

      const saveResponse = await fetch("/api/crowdrag/save-index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      const saveData = await saveResponse.json().catch(() => ({}));

      if (!saveResponse.ok) {
        throw new Error(saveData.message || "Could not save RAG index.");
      }

      setStatus(
        `✅ RAG index rebuilt successfully! ${saveData.indexedCount} items indexed.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown indexing error.";

      setStatus(`❌ Ingest failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">CrowdLang Admin</h1>

      <button
        onClick={runIngest}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
      >
        {loading ? "Rebuilding RAG Index…" : "Rebuild RAG Index"}
      </button>

      {status && (
        <div className="p-3 border rounded bg-gray-50 text-sm">{status}</div>
      )}
    </div>
  );
}
