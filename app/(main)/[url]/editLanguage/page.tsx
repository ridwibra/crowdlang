"use client";

import DotLoaderSpinner from "@/components/shared/DotLoader";
import { COUNTRIES } from "@/utils/countries";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

interface PageProps {
  params: Promise<{ url: string }>;
}

interface Language {
  _id: string;
  name: string;
  countries: string[];
}

interface LanguageApiResponse {
  languages: Language[];
}

export default function EditLanguagePage({ params }: PageProps) {
  const router = useRouter();

  const { url } = use(params);
  const languageName = decodeURIComponent(url);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");

  const [languageId, setLanguageId] = useState("");
  const [name, setName] = useState("");
  const [countries, setCountries] = useState<string[]>([""]);

  const [nameError, setNameError] = useState("");
  const [countriesError, setCountriesError] = useState("");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const response = await fetch("/api/language", {
          cache: "no-store",
        });

        const data: LanguageApiResponse = await response.json();

        if (!response.ok) {
          setMessageType("error");
          setMessage(data as unknown as string);
          return;
        }

        const language = data.languages.find(
          (item: Language) =>
            item.name.toLowerCase() === languageName.toLowerCase(),
        );

        if (!language) {
          setMessageType("error");
          setMessage("Language not found.");
          return;
        }

        setLanguageId(language._id);
        setName(language.name);
        setCountries(language.countries?.length ? language.countries : [""]);
      } catch {
        setMessageType("error");
        setMessage("Something went wrong while loading the language.");
      } finally {
        setLoading(false);
      }
    };

    loadLanguage();
  }, [languageName]);

  const updateCountry = (index: number, value: string) => {
    setCountries((previousCountries) =>
      previousCountries.map((country, i) => (i === index ? value : country)),
    );

    setCountriesError("");
  };

  const addCountry = () => {
    setCountries((previousCountries) => [...previousCountries, ""]);

    setCountriesError("");
  };

  const removeCountry = (index: number) => {
    setCountries((previousCountries) =>
      previousCountries.filter((_, i) => i !== index),
    );

    setCountriesError("");
  };

  const validateForm = () => {
    let valid = true;

    setMessage("");
    setNameError("");
    setCountriesError("");

    if (!name.trim()) {
      setNameError("Language name is required.");
      valid = false;
    } else if (name.trim().length < 2) {
      setNameError("Language name must be at least 2 characters.");
      valid = false;
    }

    const selectedCountries = countries.filter(Boolean);

    if (selectedCountries.length !== countries.length) {
      setCountriesError("Please select a country for every country field.");
      valid = false;
    }

    if (new Set(selectedCountries).size !== selectedCountries.length) {
      setCountriesError("Each country can only be selected once.");
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) return;
    if (!languageId) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/language/${languageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          countries,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.field === "name") {
          setNameError(data.message);
        } else if (data.field === "countries") {
          setCountriesError(data.message);
        } else {
          setMessageType("error");
          setMessage(data.message || "Failed to update language.");
        }

        return;
      }

      setMessageType("success");
      setMessage("Language updated successfully.");

      setTimeout(() => {
        router.refresh();
        router.push(`/${encodeURIComponent(name.trim())}`);
      }, 800);
    } catch {
      setMessageType("error");
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            A
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Loading language details...
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Please wait a moment.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <DotLoaderSpinner loading={saving} />

      <main className="min-h-screen bg-slate-50 py-6 dark:bg-slate-950 sm:py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:text-slate-400 dark:hover:text-white dark:focus:ring-offset-slate-950"
          >
            <span aria-hidden="true">←</span>
            Back to language
          </button>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-6 py-7 dark:border-indigo-500/15 dark:from-indigo-500/10 dark:via-violet-500/10 dark:to-fuchsia-500/10 sm:px-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-sm">
                  {name
                    ? name.charAt(0).toUpperCase()
                    : languageName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">
                    Language settings
                  </p>

                  <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    Edit {languageName}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Update the language name and the countries or territories
                    where it is widely spoken.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {message && (
                <div
                  className={`mb-7 flex gap-3 rounded-2xl border p-4 text-sm ${
                    messageType === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : "border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      messageType === "success"
                        ? "bg-emerald-600"
                        : "bg-red-600"
                    }`}
                  >
                    {messageType === "success" ? "✓" : "!"}
                  </span>

                  <p className="leading-5">{message}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Language name */}
                <section>
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Basic information
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      Language name
                    </h2>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                      Name
                    </label>

                    <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                      Use the most commonly recognized name for this language.
                    </p>

                    <input
                      type="text"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setNameError("");
                      }}
                      placeholder="Enter language name"
                      className={`min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 ${
                        nameError
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500"
                          : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-700 dark:focus:border-indigo-400"
                      }`}
                    />

                    {nameError && (
                      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                          !
                        </span>

                        {nameError}
                      </div>
                    )}
                  </div>
                </section>

                {/* Countries */}
                <section className="border-t border-slate-200 pt-8 dark:border-slate-800">
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Geographic information
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        Countries and territories
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Add every country or territory where this language is
                        widely spoken.
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {countries.filter(Boolean).length} selected
                    </span>
                  </div>

                  <div
                    className={`space-y-3 rounded-2xl border p-4 sm:p-5 ${
                      countriesError
                        ? "border-red-300 bg-red-50/40 dark:border-red-500/40 dark:bg-red-500/5"
                        : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30"
                    }`}
                  >
                    {countries.map((country: string, index: number) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {index + 1}
                        </span>

                        <select
                          value={country}
                          onChange={(event) =>
                            updateCountry(index, event.target.value)
                          }
                          className={`min-h-11 flex-1 rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-4 dark:bg-slate-800 dark:text-white ${
                            countriesError
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-700 dark:focus:border-indigo-400"
                          }`}
                        >
                          <option value="" disabled>
                            Select a country or territory...
                          </option>

                          {COUNTRIES.map((countryName: string) => {
                            const alreadySelected =
                              countries.includes(countryName) &&
                              country !== countryName;

                            return (
                              <option
                                key={countryName}
                                value={countryName}
                                disabled={alreadySelected}
                              >
                                {countryName}
                              </option>
                            );
                          })}
                        </select>

                        {countries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCountry(index)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 dark:focus:ring-offset-slate-900"
                            aria-label={`Remove country or territory ${
                              index + 1
                            }`}
                          >
                            <span className="mr-1">✕</span>
                            Remove
                          </button>
                        )}
                      </div>
                    ))}

                    {countriesError && (
                      <div className="flex items-center gap-2 pt-1 text-sm font-medium text-red-600 dark:text-red-400">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                          !
                        </span>

                        {countriesError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={addCountry}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-500/10 dark:focus:ring-offset-slate-900"
                    >
                      <span className="mr-2 text-base leading-none">+</span>
                      Add country or territory
                    </button>
                  </div>
                </section>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={saving}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || !languageId}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
                  >
                    {saving ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Saving changes...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
