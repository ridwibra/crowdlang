"use client";

export default function DeleteAlphabetButton({ id }: { id: string }) {
  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this alphabet?")) {
      return;
    }

    const response = await fetch(`/api/alphabet/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Failed to delete alphabet.");
      return;
    }

    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 dark:focus:ring-offset-slate-900"
    >
      Delete alphabet
    </button>
  );
}
