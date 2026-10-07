"use client";

import { useState } from "react";

export default function DeleteLanguageButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Request deletion of ${name}? The language will be marked for deletion and a global admin must approve the request before it is permanently removed.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/languages/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            data.error ||
            "Failed to submit the language deletion request.",
        );
        return;
      }

      setMessage(
        data.message ||
          "Deletion request submitted. A global admin must approve or refuse it.",
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch {
      setMessage("Something went wrong while submitting the deletion request.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 dark:focus:ring-offset-slate-900"
      >
        {deleting ? "Submitting request..." : "Request language deletion"}
      </button>

      {message && (
        <p
          role="alert"
          className="max-w-md text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {message}
        </p>
      )}
    </div>
  );
}
