"use client";

export default function DeleteEssayButton({ id }: { id: string }) {
  async function handleDelete() {
    if (!confirm("Delete this essay?")) return;

    const response = await fetch(`/api/essay/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Failed to delete essay.");
      return;
    }

    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:text-red-300 dark:hover:bg-red-500/10 dark:focus:ring-offset-slate-900"
    >
      Delete essay
    </button>
  );
}
