"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteLanguageStructureButtonProps {
  id: string;
}

export default function DeleteLanguageStructureButton({
  id,
}: DeleteLanguageStructureButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete all writing directions and constituent-order patterns for this language?",
    );

    if (!confirmed) return;

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/structure/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to delete language structure details.",
        );
      }

      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete language structure details.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={isDeleting}
        onClick={handleDelete}
        className="
          inline-flex min-h-11 items-center justify-center rounded-xl
          border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold
          text-red-700 transition hover:bg-red-100
          disabled:cursor-not-allowed disabled:opacity-50
          dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300
          dark:hover:bg-red-500/20
        "
      >
        {isDeleting ? "Deleting..." : "Delete structure"}
      </button>

      {error && (
        <p
          role="alert"
          className="max-w-sm text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
