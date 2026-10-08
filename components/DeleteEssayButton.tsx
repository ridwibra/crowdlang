"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteMedia } from "@/utils/files/requests";

export default function DeleteEssayButton({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

  async function handleDelete() {
    if (deleting) return;

    const retrying = pendingImages.length > 0;
    if (!retrying && !confirm("Delete this essay and its images?")) return;

    setDeleting(true);

    try {
      let imageIds = pendingImages;

      if (!retrying) {
        const response = await fetch(`/api/essay/${id}`, {
          method: "DELETE",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          toast.error(data.message || "Failed to delete essay.");
          return;
        }

        imageIds = data.imagePublicIds || [];
        setPendingImages(imageIds);
      }

      const results = await Promise.allSettled(
        imageIds.map(async (publicId) => {
          const result = await deleteMedia(publicId);
          if (!result.success) throw new Error("Image deletion failed.");
        }),
      );

      const failed = imageIds.filter(
        (_, index) => results[index].status === "rejected",
      );
      setPendingImages(failed);

      if (failed.length) {
        toast.error(
          "Essay deleted, but some images remain. Click Retry image cleanup.",
        );
        return;
      }

      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deletion failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/10 dark:focus:ring-offset-slate-900"
    >
      {deleting
        ? "Deleting..."
        : pendingImages.length
          ? "Retry image cleanup"
          : "Delete essay"}
    </button>
  );
}
