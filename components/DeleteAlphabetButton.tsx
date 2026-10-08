"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function DeleteAlphabetButton({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      deleting ||
      !confirm("Are you sure you want to delete this alphabet?")
    ) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/alphabet/${id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Failed to delete alphabet.");
        return;
      }

      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete alphabet.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 dark:focus:ring-offset-slate-900"
    >
      {deleting ? "Deleting..." : "Delete alphabet"}
    </button>
  );
}
