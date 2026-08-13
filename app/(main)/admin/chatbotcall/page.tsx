"use client";

import React, { useState } from "react";

export default function AdminPage() {
  const [status, setStatus] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  const runIngest = async () => {
    setLoading(true);
    setStatus("Running ingest…");

    try {
      const res = await fetch("/api/crowdrag/ingest", {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(
          `❌ Ingest failed: ${err.message || err.error || res.statusText}`,
        );
      } else {
        setStatus("✅ RAG index rebuilt successfully!");
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }

    setLoading(false);
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
