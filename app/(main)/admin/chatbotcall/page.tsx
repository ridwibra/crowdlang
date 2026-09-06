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

type RAGItem = RAGDocument & {
  embedding: number[];
};

export default function AdminPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runIngest = async () => {
    setLoading(true);
    setStatus("Preparing CrowdLang content…");

    try {
      const prepareResponse = await fetch("/api/crowdrag/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "prepare",
        }),
      });

      const prepareData = await prepareResponse.json().catch(() => ({}));

      if (!prepareResponse.ok || !Array.isArray(prepareData.documents)) {
        throw new Error(
          prepareData.message || "Could not prepare RAG documents.",
        );
      }

      const documents = prepareData.documents as RAGDocument[];

      if (documents.length === 0) {
        throw new Error("There is no CrowdLang content to index.");
      }

      const items: RAGItem[] = [];

      for (let index = 0; index < documents.length; index += 1) {
        const document = documents[index];

        setStatus(
          `Loading model / creating embedding ${index + 1} of ${
            documents.length
          }…`,
        );

        const embedding = await embedText(document.text);

        items.push({
          ...document,
          embedding,
        });
      }

      setStatus("Saving the new RAG index…");

      const saveResponse = await fetch("/api/crowdrag/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save",
          items,
        }),
      });

      const saveData = await saveResponse.json().catch(() => ({}));

      if (!saveResponse.ok) {
        throw new Error(saveData.message || "Could not save the RAG index.");
      }

      setStatus(
        `✅ RAG index rebuilt successfully! ${
          saveData.indexedCount ?? items.length
        } items indexed.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";

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
