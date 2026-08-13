"use client";

export default function DeleteLanguageButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const handleDelete = async () => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    const response = await fetch(`/api/language/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      window.location.href = "/";
    } else {
      alert("Failed to delete language.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 dark:focus:ring-offset-slate-900"
    >
      Delete language
    </button>
  );
}
