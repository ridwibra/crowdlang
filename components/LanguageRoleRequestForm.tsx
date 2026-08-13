"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type LanguageRole = "user" | "editor" | "expert";

type LanguageItem = {
  _id: string;
  name: string;
  countries: string[];
  status: "active" | "archived";
};

type Props = {
  languageRoles: Record<string, LanguageRole>;
};

const REQUESTABLE_ROLES: Array<"editor" | "expert"> = ["editor", "expert"];

export default function LanguageRoleRequestForm({ languageRoles }: Props) {
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);

  const [languageId, setLanguageId] = useState("");
  const [requestedRole, setRequestedRole] = useState<"editor" | "expert">(
    "editor",
  );
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadLanguages = async () => {
      try {
        const response = await fetch("/api/language", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load languages.");
        }

        if (!mounted) return;

        const activeLanguages = (data.languages || [])
          .filter((language: LanguageItem) => language.status === "active")
          .sort((a: LanguageItem, b: LanguageItem) =>
            a.name.localeCompare(b.name),
          );

        setLanguages(activeLanguages);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load available languages.",
        );
      } finally {
        if (mounted) {
          setLoadingLanguages(false);
        }
      }
    };

    loadLanguages();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedLanguage = useMemo(
    () => languages.find((language) => language._id === languageId) ?? null,
    [languages, languageId],
  );

  const currentRole = selectedLanguage
    ? languageRoles[selectedLanguage.name] || "user"
    : "user";

  const cleanedJustification = justification.trim();

  const canSubmit =
    Boolean(selectedLanguage) &&
    cleanedJustification.length >= 20 &&
    cleanedJustification.length <= 2000 &&
    !submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedLanguage) {
      toast.error("Please select a language.");
      return;
    }

    if (cleanedJustification.length < 20) {
      toast.error("Justification must be at least 20 characters.");
      return;
    }

    if (cleanedJustification.length > 2000) {
      toast.error("Justification cannot exceed 2,000 characters.");
      return;
    }

    if (currentRole === requestedRole) {
      toast.error(
        `You already have the ${requestedRole} role for ${selectedLanguage.name}.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/languages/${selectedLanguage._id}/requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestedRole,
            justification: cleanedJustification,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Failed to submit request.",
        );
      }

      toast.success(
        data.message || "Language role request submitted successfully.",
      );

      setLanguageId("");
      setRequestedRole("editor");
      setJustification("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit language role request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
          Contribution Access
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          Request a Language Role
        </h2>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Request editor or expert access for an active language. You can have
          up to three pending requests at one time.
        </p>
      </div>

      {loadingLanguages ? (
        <div className="flex items-center gap-3 py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            Loading available languages...
          </span>
        </div>
      ) : languages.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          There are currently no active languages available for role requests.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Language
            </label>

            <select
              value={languageId}
              disabled={submitting}
              onChange={(event) => setLanguageId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select a language...</option>

              {languages.map((language) => (
                <option key={language._id} value={language._id}>
                  {language.name}
                  {language.countries.length
                    ? ` — ${language.countries.join(", ")}`
                    : ""}
                </option>
              ))}
            </select>

            {selectedLanguage && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Your current role for {selectedLanguage.name}:{" "}
                <span className="font-semibold capitalize">{currentRole}</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Preferred Role
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {REQUESTABLE_ROLES.map((role) => {
                const selected = requestedRole === role;

                return (
                  <button
                    key={role}
                    type="button"
                    disabled={submitting}
                    onClick={() => setRequestedRole(role)}
                    className={`rounded-xl border p-4 text-left transition disabled:opacity-60 ${
                      selected
                        ? role === "expert"
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40"
                          : "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                        role === "expert"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {role}
                    </span>

                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                      {role === "editor"
                        ? "Help create, improve, and review language content."
                        : "Provide advanced linguistic and cultural expertise."}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Justification
            </label>

            <textarea
              value={justification}
              disabled={submitting}
              maxLength={2000}
              rows={7}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Describe your language fluency, teaching or professional experience, cultural knowledge, qualifications, or other relevant expertise..."
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="mt-2 flex justify-between gap-3 text-xs">
              <p
                className={
                  cleanedJustification.length > 0 &&
                  cleanedJustification.length < 20
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-500 dark:text-slate-400"
                }
              >
                Minimum 20 characters required.
              </p>

              <p className="text-slate-500 dark:text-slate-400">
                {justification.length}/2000
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting Request..." : "Submit Role Request"}
          </button>
        </form>
      )}
    </section>
  );
}
