"use client";

import React, { useState } from "react";

export default function AdminPage() {
  const [status, setStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const runIngest = async () => {
    setLoading(true);
    setStatus("Rebuilding the CrowdLang RAG index…");

    try {
      const response = await fetch("/api/crowdrag/ingest", {
        method: "POST",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Could not rebuild the RAG index.");
      }

      const indexedCount =
        typeof data.indexedCount === "number" ? data.indexedCount : 0;

      setStatus(
        `✅ RAG index rebuilt successfully! ${indexedCount} items indexed.`,
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
