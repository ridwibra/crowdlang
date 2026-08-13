"use client";

import DotLoaderSpinner from "@/components/shared/DotLoader";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";

interface LanguageType {
  _id: string;
  name: string;
  countries: string[];
}

interface TranslationCell {
  value: string;
  rowId: string;
}

interface TableRow {
  english: string;
  translations: Record<string, TranslationCell>;
  textType: "word" | "sentence" | "expression" | "passage";
}

interface LanguageApiResponse {
  languages: LanguageType[];
}

interface TableApiRow {
  _id: string;
  english: string;
  translations: Record<string, TranslationCell>;
  textType: "word" | "sentence" | "expression" | "passage";
}

interface TableApiResponse {
  rows: TableApiRow[];
}

const ALL_TYPES = ["word", "sentence", "expression", "passage"] as const;

type RowActionMode = "edit" | "delete";
interface ActionMenuPosition {
  top: number;
  left: number;
}

export default function Home() {
  const [languages, setLanguages] = useState<LanguageType[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedLangIds, setSelectedLangIds] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...ALL_TYPES]);
  const [search, setSearch] = useState("");

  const [showLanguageTools, setShowLanguageTools] = useState(false);
  const [showTypeTools, setShowTypeTools] = useState(false);

  const [actionsOpenFor, setActionsOpenFor] = useState<string | null>(null);

  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<RowActionMode | null>(null);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [selectedCellRowId, setSelectedCellRowId] = useState("");

  const [selectedLanguageQuery, setSelectedLanguageQuery] = useState("");
  const [selectedLanguageId, setSelectedLanguageId] = useState("");
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);

  const [languageText, setLanguageText] = useState("");
  const [englishText, setEnglishText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const closeActionsMenu = (event: MouseEvent) => {
      if (!actionsOpenFor) {
        return;
      }

      const actionCell = actionsRefs.current[actionsOpenFor];

      const clickedActionButton = actionCell?.contains(event.target as Node);

      const clickedActionsMenu = actionMenuRef.current?.contains(
        event.target as Node,
      );

      if (!clickedActionButton && !clickedActionsMenu) {
        setActionsOpenFor(null);
        setActionMenuPosition(null);
      }
    };

    const closeOnScrollOrResize = () => {
      setActionsOpenFor(null);
      setActionMenuPosition(null);
    };

    document.addEventListener("mousedown", closeActionsMenu);
    window.addEventListener("resize", closeOnScrollOrResize);
    window.addEventListener("scroll", closeOnScrollOrResize, true);

    return () => {
      document.removeEventListener("mousedown", closeActionsMenu);
      window.removeEventListener("resize", closeOnScrollOrResize);
      window.removeEventListener("scroll", closeOnScrollOrResize, true);
    };
  }, [actionsOpenFor]);

  const loadData = async () => {
    try {
      setLoadError("");

      const [languageResponse, tableResponse] = await Promise.all([
        fetch("/api/language", { cache: "no-store" }),
        fetch("/api/table", { cache: "no-store" }),
      ]);

      if (!languageResponse.ok || !tableResponse.ok) {
        throw new Error("Unable to load language data.");
      }

      const languageData: LanguageApiResponse = await languageResponse.json();

      const tableData: TableApiResponse = await tableResponse.json();

      const sortedLanguages = (languageData.languages || [])
        .slice()
        .sort((first, second) => first.name.localeCompare(second.name));

      const groupedRows = Object.values(
        (tableData.rows || []).reduce<Record<string, TableRow>>(
          (accumulator, row) => {
            const key = row.english.trim().toLowerCase();

            if (!accumulator[key]) {
              accumulator[key] = {
                english: row.english,
                translations: { ...row.translations },
                textType: row.textType,
              };
            } else {
              accumulator[key].translations = {
                ...accumulator[key].translations,
                ...row.translations,
              };
            }

            return accumulator;
          },
          {},
        ),
      ).sort((first, second) => first.english.localeCompare(second.english));

      setLanguages(sortedLanguages);
      setSelectedLangIds(sortedLanguages.map((language) => language._id));
      setRows(groupedRows);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load language data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedLanguages = useMemo(
    () =>
      languages
        .slice()
        .sort((first, second) => first.name.localeCompare(second.name)),
    [languages],
  );

  const visibleLanguages = useMemo(() => {
    const selectedSet = new Set(selectedLangIds);

    return sortedLanguages.filter((language) => selectedSet.has(language._id));
  }, [selectedLangIds, sortedLanguages]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (!selectedTypes.includes(row.textType)) {
        return false;
      }

      if (!query) {
        return true;
      }

      if ((row.english || "").toLowerCase().includes(query)) {
        return true;
      }

      return Object.values(row.translations).some((translation) =>
        (translation?.value || "").toLowerCase().includes(query),
      );
    });
  }, [rows, search, selectedTypes]);

  const selectedLanguage = useMemo(
    () =>
      sortedLanguages.find((language) => language._id === selectedLanguageId) ||
      null,
    [selectedLanguageId, sortedLanguages],
  );

  const rowSelectableLanguages = useMemo(() => {
    if (!selectedRow) {
      return [];
    }

    return sortedLanguages.filter(
      (language) =>
        (selectedRow.translations?.[language._id]?.value || "").trim() !== "",
    );
  }, [selectedRow, sortedLanguages]);

  const filteredLanguageOptions = useMemo(() => {
    const query = selectedLanguageQuery.trim().toLowerCase();

    if (!query) {
      return rowSelectableLanguages;
    }

    return rowSelectableLanguages.filter((language) =>
      language.name.toLowerCase().includes(query),
    );
  }, [rowSelectableLanguages, selectedLanguageQuery]);

  const toggleLang = (languageId: string) => {
    setSelectedLangIds((previous) =>
      previous.includes(languageId)
        ? previous.filter((id) => id !== languageId)
        : [...previous, languageId],
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes((previous) =>
      previous.includes(type)
        ? previous.filter((selectedType) => selectedType !== type)
        : [...previous, type],
    );
  };

  const showAll = () => {
    setSelectedLangIds(sortedLanguages.map((language) => language._id));
  };

  const clearAll = () => {
    setSelectedLangIds([]);
  };

  const showAllTypes = () => {
    setSelectedTypes([...ALL_TYPES]);
  };

  const clearAllTypes = () => {
    setSelectedTypes([]);
  };

  const escapeCsv = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const downloadCSV = () => {
    const header = [
      "English",
      ...visibleLanguages.map((language) => language.name),
    ];

    const csvRows = [header.map(escapeCsv).join(",")];

    filteredRows.forEach((row) => {
      const rowData = [
        row.english,
        ...visibleLanguages.map(
          (language) => row.translations?.[language._id]?.value || "",
        ),
      ];

      csvRows.push(rowData.map(escapeCsv).join(","));
    });

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "crowdlang-language-table.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const header = [
      "English",
      ...visibleLanguages.map((language) => language.name),
    ];

    const sheetData: (string | undefined)[][] = [header];

    filteredRows.forEach((row) => {
      sheetData.push([
        row.english,
        ...visibleLanguages.map(
          (language) => row.translations?.[language._id]?.value || "",
        ),
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Language Table");
    XLSX.writeFile(workbook, "crowdlang-language-table.xlsx");
  };

  const openModal = (mode: RowActionMode, row: TableRow, cellRowId = "") => {
    setSelectedRow(row);
    setSelectedCellRowId(cellRowId);
    setModalMode(mode);

    setSelectedLanguageId("");
    setSelectedLanguageQuery("");
    setShowLanguageOptions(false);

    setLanguageText("");
    setEnglishText(mode === "edit" ? row.english : "");

    setModalOpen(true);
    setActionsOpenFor(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalMode(null);
    setSelectedRow(null);
    setSelectedCellRowId("");

    setSelectedLanguageId("");
    setSelectedLanguageQuery("");
    setShowLanguageOptions(false);

    setLanguageText("");
    setEnglishText("");
  };

  const chooseLanguage = (language: LanguageType) => {
    setSelectedLanguageId(language._id);
    setSelectedLanguageQuery(language.name);
    setShowLanguageOptions(false);

    if (selectedRow) {
      setLanguageText(selectedRow.translations?.[language._id]?.value || "");

      setEnglishText(selectedRow.english || "");

      setSelectedCellRowId(
        selectedRow.translations?.[language._id]?.rowId || "",
      );
    }
  };

  const handleSave = async () => {
    if (!selectedRow || !modalMode || !selectedCellRowId) {
      return;
    }

    setSaving(true);

    try {
      if (modalMode === "delete") {
        const response = await fetch(`/api/table/${selectedCellRowId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete translation.");
        }

        await loadData();
        closeModal();

        return;
      }

      if (!selectedLanguageId) {
        return;
      }

      const response = await fetch(`/api/table/${selectedCellRowId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: englishText.trim(),
          translation: languageText.trim(),
          language: selectedLanguageId,
          textType: selectedRow.textType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update translation.");
      }

      await loadData();
      closeModal();
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  const canSaveEdit =
    modalMode === "edit"
      ? Boolean(
          selectedRow &&
          selectedCellRowId &&
          selectedLanguageId &&
          englishText.trim() &&
          languageText.trim(),
        )
      : Boolean(selectedRow && selectedCellRowId);
  const activeActionRow = useMemo(() => {
    if (!actionsOpenFor) {
      return null;
    }

    return (
      filteredRows.find(
        (row, rowIndex) => `${row.english}-${rowIndex}` === actionsOpenFor,
      ) || null
    );
  }, [actionsOpenFor, filteredRows]);

  const toggleActionsMenu = (rowKey: string) => {
    if (actionsOpenFor === rowKey) {
      setActionsOpenFor(null);
      setActionMenuPosition(null);
      return;
    }

    const actionCell = actionsRefs.current[rowKey];

    if (!actionCell) {
      return;
    }

    const rect = actionCell.getBoundingClientRect();

    const menuWidth = 192;
    const screenPadding = 12;

    const left = Math.min(
      Math.max(screenPadding, rect.left),
      window.innerWidth - menuWidth - screenPadding,
    );

    setActionMenuPosition({
      top: rect.bottom + 8,
      left,
    });

    setActionsOpenFor(rowKey);
  };
  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-xl text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
            ⌕
          </div>

          <p className="mt-4 font-semibold text-slate-800 dark:text-white">
            Loading language table...
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Preparing translations and available languages.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <DotLoaderSpinner loading={saving} showText text="Saving..." />

      <section className="flex flex-col gap-5 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
            CrowdLang workspace
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Language Table
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Search, compare, edit, and export language data across your
            available languages.
          </p>
        </div>

        <Link
          href="/addLanguage"
          className="inline-flex min-h-11 w-fit shrink-0 items-center justify-center self-start rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:from-teal-600 hover:to-cyan-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
        >
          <span className="mr-2 text-lg leading-none">+</span>
          Add language
        </Link>
      </section>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
          >
            !
          </span>

          <span>{loadError}</span>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400"
            >
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search English text or any translation..."
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCSV}
              disabled={filteredRows.length === 0}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              Download CSV
            </button>

            <button
              type="button"
              onClick={downloadExcel}
              disabled={filteredRows.length === 0}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300"
            >
              Download Excel
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-lg dark:bg-teal-950/60"
            >
              ⚙
            </span>

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Table filters
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose text types and visible language columns.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-expanded={showTypeTools}
              onClick={() => setShowTypeTools((previous) => !previous)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                showTypeTools
                  ? "border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-300"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Text types
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {selectedTypes.length}/{ALL_TYPES.length}
              </span>
              <span
                aria-hidden="true"
                className={`text-sm transition-transform ${
                  showTypeTools ? "rotate-180" : ""
                }`}
              >
                ↓
              </span>
            </button>

            <button
              type="button"
              aria-expanded={showLanguageTools}
              onClick={() => setShowLanguageTools((previous) => !previous)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                showLanguageTools
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Languages
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {selectedLangIds.length}/{sortedLanguages.length}
              </span>
              <span
                aria-hidden="true"
                className={`text-sm transition-transform ${
                  showLanguageTools ? "rotate-180" : ""
                }`}
              >
                ↓
              </span>
            </button>
          </div>
        </div>

        {showTypeTools && (
          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Text types
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={showAllTypes}
                  className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-teal-700"
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={clearAllTypes}
                  className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((type) => {
                const isSelected = selectedTypes.includes(type);

                return (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-300"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleType(type)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />

                    <span className="capitalize">{type}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {showLanguageTools && (
          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Visible language columns
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={showAll}
                  className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-indigo-700"
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-44 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {sortedLanguages.map((language) => {
                  const isSelected = selectedLangIds.includes(language._id);

                  return (
                    <label
                      key={language._id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLang(language._id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />

                      {language.name}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">
              Translation results
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {filteredRows.length}{" "}
              {filteredRows.length === 1 ? "entry" : "entries"} found
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {visibleLanguages.length}{" "}
            {visibleLanguages.length === 1 ? "language" : "languages"} visible
          </span>
        </div>

        <div className="w-full min-w-0 max-w-[calc(100vw-2rem)] max-h-[650px] overflow-x-auto overflow-y-auto">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm dark:bg-slate-800">
              <tr>
                <th className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  Actions
                </th>

                <th className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  English
                </th>

                {visibleLanguages.map((language) => (
                  <th
                    key={language._id}
                    className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    <Link
                      href={`/${encodeURIComponent(language.name)}`}
                      title={`View ${language.name} language details`}
                      className="group inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-bold normal-case tracking-normal text-teal-700 transition hover:-translate-y-0.5 hover:border-teal-500 hover:bg-teal-600 hover:text-white hover:shadow-sm dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-300"
                    >
                      <span>{language.name}</span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleLanguages.length + 2}
                    className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No translations found. Add a translation to begin populating
                    this table.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rowIndex) => {
                  const rowKey = `${row.english}-${rowIndex}`;

                  return (
                    <tr
                      key={rowKey}
                      className="transition hover:bg-teal-50/60 odd:bg-slate-50 dark:odd:bg-slate-900/60 dark:hover:bg-teal-950/20"
                    >
                      <td
                        ref={(element) => {
                          actionsRefs.current[rowKey] = element;
                        }}
                        className="relative whitespace-nowrap border-b border-r border-slate-200 px-4 py-3 align-top dark:border-slate-800"
                      >
                        <button
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={actionsOpenFor === rowKey}
                          onClick={() => toggleActionsMenu(rowKey)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500"
                        >
                          Actions
                          <span aria-hidden="true">▾</span>
                        </button>
                      </td>

                      <td className="border-b border-r border-slate-200 px-4 py-3 align-top font-medium text-slate-900 dark:border-slate-800 dark:text-white">
                        {row.english}
                      </td>

                      {visibleLanguages.map((language) => (
                        <td
                          key={language._id}
                          className="border-b border-r border-slate-200 px-4 py-3 align-top text-slate-700 dark:border-slate-800 dark:text-slate-200"
                        >
                          {row.translations?.[language._id]?.value || (
                            <span className="text-slate-400 dark:text-slate-600">
                              —
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      {typeof document !== "undefined" &&
        activeActionRow &&
        actionMenuPosition &&
        createPortal(
          <div
            ref={actionMenuRef}
            role="menu"
            className="fixed z-[100] w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{
              top: actionMenuPosition.top,
              left: actionMenuPosition.left,
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                openModal("edit", activeActionRow);
                setEnglishText(activeActionRow.english || "");
                setActionsOpenFor(null);
                setActionMenuPosition(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-700 dark:text-slate-200 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
            >
              <span aria-hidden="true">✎</span>
              Edit row
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                openModal("delete", activeActionRow);
                setActionsOpenFor(null);
                setActionMenuPosition(null);
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <span aria-hidden="true">🗑</span>
              Delete row
            </button>
          </div>,
          document.body,
        )}
      {modalOpen && selectedRow && modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="translation-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
                  Translation management
                </p>

                <h3
                  id="translation-modal-title"
                  className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white"
                >
                  {modalMode === "edit"
                    ? "Edit translation"
                    : "Delete translation"}
                </h3>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  English text:{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {selectedRow.english}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="relative mt-6">
              <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                Language
              </label>

              <input
                value={selectedLanguageQuery}
                onChange={(event) => {
                  const value = event.target.value;

                  setSelectedLanguageQuery(value);
                  setShowLanguageOptions(true);

                  const exactLanguage = rowSelectableLanguages.find(
                    (language) =>
                      language.name.toLowerCase() === value.toLowerCase(),
                  );

                  if (exactLanguage) {
                    setSelectedLanguageId(exactLanguage._id);
                    setSelectedCellRowId(
                      selectedRow.translations?.[exactLanguage._id]?.rowId ||
                        "",
                    );
                    setLanguageText(
                      selectedRow.translations?.[exactLanguage._id]?.value ||
                        "",
                    );
                  } else {
                    setSelectedLanguageId("");
                    setSelectedCellRowId("");
                    setLanguageText("");
                  }
                }}
                onFocus={() => setShowLanguageOptions(true)}
                placeholder="Type a language name..."
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />

              {showLanguageOptions && filteredLanguageOptions.length > 0 && (
                <div className="absolute z-30 mt-2 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {filteredLanguageOptions.map((language) => (
                    <button
                      key={language._id}
                      type="button"
                      onClick={() => chooseLanguage(language)}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-teal-50 dark:text-slate-200 dark:hover:bg-teal-950/30"
                    >
                      {language.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {modalMode === "delete" && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                <p className="font-bold text-red-800 dark:text-red-200">
                  This action cannot be undone.
                </p>

                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="font-semibold text-slate-700 dark:text-slate-200">
                      Language:
                    </dt>

                    <dd className="text-slate-600 dark:text-slate-300">
                      {selectedLanguage?.name || selectedLanguageQuery || "—"}
                    </dd>
                  </div>

                  <div className="flex gap-2">
                    <dt className="font-semibold text-slate-700 dark:text-slate-200">
                      Text:
                    </dt>

                    <dd className="break-words text-slate-600 dark:text-slate-300">
                      {selectedLanguageId
                        ? selectedRow.translations?.[selectedLanguageId]
                            ?.value || "—"
                        : "Select a language first."}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {modalMode === "edit" && (
              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                    Text in selected language
                  </label>

                  <textarea
                    value={languageText}
                    onChange={(event) => setLanguageText(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                    English translation
                  </label>

                  <textarea
                    value={englishText}
                    onChange={(event) => setEnglishText(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSaveEdit || saving}
                className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  modalMode === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {saving
                  ? modalMode === "delete"
                    ? "Deleting..."
                    : "Saving..."
                  : modalMode === "delete"
                    ? "Delete translation"
                    : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
