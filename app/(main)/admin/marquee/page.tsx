"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

type MarqueeItem = {
  _id: string;
  text: string;
  link: string;
  isActive: boolean;
  speed: number;
  backgroundColor: string;
  textColor: string;
  createdAt: string;
  updatedAt: string;
};

const initialForm = {
  text: "",
  link: "",
  isActive: true,
  speed: 25,
  backgroundColor: "#0f766e",
  textColor: "#ffffff",
};

export default function AdminMarqueePage() {
  const [marquees, setMarquees] = useState<MarqueeItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadMarquees() {
    try {
      setLoading(true);

      const response = await fetch("/api/marquee", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load marquee messages.");
      }

      setMarquees(data.marquees || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load marquee messages.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarquees();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  function startEdit(item: MarqueeItem) {
    setEditingId(item._id);

    setForm({
      text: item.text,
      link: item.link || "",
      isActive: item.isActive,
      speed: item.speed,
      backgroundColor: item.backgroundColor,
      textColor: item.textColor,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.text.trim()) {
      toast.error("Enter a marquee message.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        editingId ? `/api/marquee/${editingId}` : "/api/marquee",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            text: form.text.trim(),
            link: form.link.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save marquee message.");
      }

      toast.success(
        editingId ? "Marquee message updated." : "Marquee message created.",
      );

      resetForm();
      await loadMarquees();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save marquee message.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: MarqueeItem) {
    try {
      const response = await fetch(`/api/marquee/${item._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: item.text,
          link: item.link || "",
          isActive: !item.isActive,
          speed: item.speed,
          backgroundColor: item.backgroundColor,
          textColor: item.textColor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update marquee status.");
      }

      toast.success(
        item.isActive
          ? "Marquee message hidden."
          : "Marquee message activated.",
      );

      await loadMarquees();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update marquee status.",
      );
    }
  }

  async function deleteMarquee(id: string) {
    if (!window.confirm("Delete this marquee message permanently?")) {
      return;
    }

    try {
      const response = await fetch(`/api/marquee/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete marquee message.");
      }

      if (editingId === id) {
        resetForm();
      }

      toast.success("Marquee message deleted.");
      await loadMarquees();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete marquee message.",
      );
    }
  }

  return (
    <div className="min-w-0 space-y-8">
      <section className="rounded-3xl border border-white/50 bg-white/80 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
          Site announcements
        </p>

        <h1 className="mt-2 bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-teal-300 dark:to-cyan-300 sm:text-4xl">
          Marquee Manager
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Create announcements that appear beneath the website header.
        </p>
      </section>

      <section className="min-w-0 rounded-3xl border border-white/50 bg-white/80 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {editingId ? "Edit announcement" : "Create announcement"}
          </h2>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            You can enable or hide an announcement without deleting it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="marquee-text"
              className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Announcement text
            </label>

            <textarea
              id="marquee-text"
              required
              maxLength={500}
              rows={3}
              value={form.text}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  text: event.target.value,
                }))
              }
              placeholder="Example: New languages are now available to explore."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="marquee-link"
              className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Destination link <span className="font-normal">(optional)</span>
            </label>

            <input
              id="marquee-link"
              type="text"
              value={form.link}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  link: event.target.value,
                }))
              }
              placeholder="/languages"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="marquee-speed"
                className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
              >
                Duration in seconds
              </label>

              <input
                id="marquee-speed"
                type="number"
                min="8"
                max="120"
                value={form.speed}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    speed: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="marquee-background"
                className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
              >
                Background color
              </label>

              <input
                id="marquee-background"
                type="color"
                value={form.backgroundColor}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    backgroundColor: event.target.value,
                  }))
                }
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label
                htmlFor="marquee-text-color"
                className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
              >
                Text color
              </label>

              <input
                id="marquee-text-color"
                type="color"
                value={form.textColor}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    textColor: event.target.value,
                  }))
                }
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Display this marquee on the website
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-700">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="min-h-11 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:from-teal-600 hover:to-cyan-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create marquee"}
            </button>
          </div>
        </form>
      </section>

      <section className="min-w-0 overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Existing announcements
          </h2>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Hide old announcements or remove ones you no longer need.
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-600 dark:text-slate-300">
            Loading announcements...
          </p>
        ) : marquees.length === 0 ? (
          <p className="p-6 text-sm text-slate-600 dark:text-slate-300">
            No marquee announcements have been created yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {marquees.map((item) => (
              <article
                key={item._id}
                className="flex min-w-0 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        item.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {item.isActive ? "Active" : "Hidden"}
                    </span>

                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {item.speed}s duration
                    </span>
                  </div>

                  <p className="mt-3 break-words text-sm font-semibold text-slate-900 dark:text-white">
                    {item.text}
                  </p>

                  {item.link && (
                    <p className="mt-1 break-all text-xs text-teal-700 dark:text-teal-300">
                      {item.link}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(item)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {item.isActive ? "Hide" : "Show"}
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-teal-700"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteMarquee(item._id)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
