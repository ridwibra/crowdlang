"use client";

import DotLoaderSpinner from "@/components/shared/DotLoader";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COUNTRIES } from "@/utils/countries";

export default function LanguageForm() {
  const [name, setName] = useState("");
  const [countries, setCountries] = useState([""]);

  const [nameError, setNameError] = useState("");
  const [countriesError, setCountriesError] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const updateCountry = (index: number, value: string) => {
    setCountries((prev) => prev.map((c, i) => (i === index ? value : c)));

    if (!value.trim()) {
      setCountriesError("Country is required.");
    } else {
      setCountriesError("");
    }
  };

  const addCountry = () => setCountries((prev) => [...prev, ""]);
  const removeCountry = (index: number) =>
    setCountries((prev) => prev.filter((_, i) => i !== index));

  const validateForm = () => {
    let valid = true;
    setMessage("");

    if (!name.trim()) {
      setNameError("Language name is required");
      valid = false;
    } else if (name.trim().length < 2) {
      setNameError("Language name must be at least 2 characters");
      valid = false;
    } else {
      setNameError("");
    }

    for (const c of countries) {
      if (!c.trim()) {
        setCountriesError("Country is required.");
        valid = false;
        break;
      }
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, countries }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field === "name") {
          setNameError(data.message);
        } else if (data.field === "countries") {
          setCountriesError(data.message);
        } else {
          setMessage(data.message);
        }
        setLoading(false);
        return;
      }

      setMessage("Language created successfully.");

      setTimeout(() => {
        router.refresh();
        router.push("/");
      }, 800);

      setName("");
      setCountries([""]);
    } catch (error) {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <DotLoaderSpinner loading={loading} />}

      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-neutral-900 rounded-lg shadow-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 px-3 py-1 bg-neutral-200 dark:bg-neutral-700 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-semibold mb-6">ADD A NEW LANGUAGE</h1>

        {message && (
          <p className="mb-4 text-center text-sm text-red-600 dark:text-red-400">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Language Name */}
          <div>
            <label className="block font-medium mb-1">Language Name</label>
            <input
              type="text"
              className={`
                w-full px-3 py-2 rounded-md border 
                dark:border-neutral-700 dark:bg-neutral-800
                ${nameError ? "border-red-500" : "border-neutral-300"}
              `}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Hausa"
            />
            {nameError && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                {nameError}
              </p>
            )}
          </div>

          {/* Countries Dropdown */}
          <div>
            <label className="block font-medium mb-2">
              Countries/Territories Widely Spoken In
            </label>

            {countries.map((country, index) => (
              <div
                key={index}
                className={`
                  flex gap-3 mb-3 items-center p-3 rounded-md
                  bg-neutral-50 dark:bg-neutral-800
                  border
                  ${countriesError ? "border-red-500" : "border-neutral-200"}
                `}
              >
                <select
                  className={`
                    flex-1 px-3 py-2 rounded-md border 
                    dark:border-neutral-700 dark:bg-neutral-900
                    ${countriesError ? "border-red-500" : "border-neutral-300"}
                  `}
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
                    onClick={() => removeCountry(index)}
                    className="text-red-500 hover:text-red-700 font-semibold"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {countriesError && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                {countriesError}
              </p>
            )}

            <button
              type="button"
              onClick={addCountry}
              className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600"
            >
              + Add Country/Territory
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Language"}
          </button>
        </form>
      </div>
    </>
  );
}
