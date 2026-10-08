"use client";

import DotLoaderSpinner from "@/components/shared/DotLoader";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { COUNTRIES } from "@/utils/countries";
import { authClient } from "@/lib/auth-client";

export default function LanguageForm() {
  const [name, setName] = useState("");
  const [countries, setCountries] = useState<string[]>([""]);

  const [nameError, setNameError] = useState("");
  const [countriesError, setCountriesError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");

  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const router = useRouter();

  const {
    data: session,
    isPending,
    error: sessionError,
  } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !sessionError && !session?.user) {
      router.replace("/login");
    }
  }, [isPending, sessionError, session, router]);

  useEffect(() => {
    if (!created) return;

    const timeout = setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 800);

    return () => clearTimeout(timeout);
  }, [created, router]);

  const busy = loading || created;

  const updateCountry = (index: number, value: string) => {
    setCountries((prev) =>
      prev.map((country, i) => (i === index ? value : country)),
    );

    setCountriesError("");
  };

  const addCountry = () => {
    setCountries((prev) => [...prev, ""]);
    setCountriesError("");
  };

  const removeCountry = (index: number) => {
    setCountries((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );

    setCountriesError("");
  };

  const validateForm = () => {
    let valid = true;

    setMessage("");
    setMessageType("error");

    if (!name.trim()) {
      setNameError("Language name is required.");
      valid = false;
    } else if (name.trim().length < 2) {
      setNameError("Language name must be at least 2 characters.");
      valid = false;
    } else {
      setNameError("");
    }

    if (
      countries.length === 0 ||
      countries.some((country) => !country.trim())
    ) {
      setCountriesError("Please select a country for each entry.");
      valid = false;
    } else {
      setCountriesError("");
    }

    return valid;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isPending || busy) return;

    if (sessionError) {
      setMessageType("error");
      setMessage("Unable to verify your session. Please reload and try again.");
      return;
    }

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setMessage("");
    setMessageType("error");

    try {
      const res = await fetch("/api/languages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          countries: countries.map((country) => country.trim()),
        }),
      });

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof data.message === "string"
            ? data.message
            : "Unable to create the language.";

        setMessageType("error");

        if (data.field === "name") {
          setNameError(errorMessage);
        } else if (data.field === "countries") {
          setCountriesError(errorMessage);
        } else {
          setMessage(errorMessage);
        }

        return;
      }

      setMessageType("success");
      setMessage("Language created successfully.");

      setName("");
      setCountries([""]);
      setNameError("");
      setCountriesError("");
      setCreated(true);
    } catch {
      setMessageType("error");
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return <DotLoaderSpinner loading={true} />;
  }

  if (sessionError) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
      >
        Unable to verify your session. Please reload and try again.
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <>
      {loading && <DotLoaderSpinner loading={loading} />}

      <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-md dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={busy}
          className="mb-4 rounded bg-neutral-200 px-3 py-1 hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-700 dark:hover:bg-neutral-600"
        >
          ← Back
        </button>

        <h1 className="mb-6 text-2xl font-semibold">ADD A NEW LANGUAGE</h1>

        {message && (
          <p
            role={messageType === "error" ? "alert" : "status"}
            className={`mb-4 rounded-lg border px-4 py-3 text-center text-sm ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                : "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
            }`}
          >
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Language name */}
          <div>
            <label htmlFor="language-name" className="mb-1 block font-medium">
              Language Name
            </label>

            <input
              id="language-name"
              name="name"
              type="text"
              disabled={busy}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "language-name-error" : undefined}
              className={`w-full rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-800 ${
                nameError
                  ? "border-red-500 dark:border-red-500"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              placeholder="e.g., Hausa"
            />

            {nameError && (
              <p
                id="language-name-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Countries dropdowns */}
          <fieldset>
            <legend className="mb-2 font-medium">
              Countries/Territories Widely Spoken In
            </legend>

            {countries.map((country, index) => (
              <div
                key={index}
                className={`mb-3 flex items-center gap-3 rounded-md border bg-neutral-50 p-3 dark:bg-neutral-800 ${
                  countriesError
                    ? "border-red-500 dark:border-red-500"
                    : "border-neutral-200 dark:border-neutral-700"
                }`}
              >
                <select
                  aria-label={`Country or territory ${index + 1}`}
                  aria-invalid={Boolean(countriesError)}
                  aria-describedby={
                    countriesError ? "countries-error" : undefined
                  }
                  disabled={busy}
                  className={`min-w-0 flex-1 rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-900 ${
                    countriesError
                      ? "border-red-500 dark:border-red-500"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                  value={country}
                  onChange={(e) => updateCountry(index, e.target.value)}
                >
                  <option value="">Select a country...</option>

                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {countries.length > 1 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeCountry(index)}
                    aria-label={`Remove country or territory ${index + 1}`}
                    className="font-semibold text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {countriesError && (
              <p
                id="countries-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {countriesError}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={addCountry}
              className="mt-3 rounded-md bg-neutral-200 px-4 py-2 hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-700 dark:hover:bg-neutral-600"
            >
              + Add Country/Territory
            </button>
          </fieldset>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : created
                ? "Created! Redirecting..."
                : "Create Language"}
          </button>
        </form>
      </div>
    </>
  );
}
