"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ActivityTrackerControlsProps {
  timeZone: string;
  generatedAt: string;
}

export default function ActivityTrackerControls({
  timeZone,
  generatedAt,
}: ActivityTrackerControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [ready, setReady] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState("");

  useEffect(() => {
    const browserTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const url = new URL(window.location.href);

    if (url.searchParams.get("tz") !== browserTimeZone) {
      url.searchParams.set("tz", browserTimeZone);

      router.replace(`${url.pathname}${url.search}`, {
        scroll: false,
      });
    }

    setReady(true);
  }, [router, timeZone]);

  useEffect(() => {
    setUpdatedLabel(
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(new Date(generatedAt)),
    );
  }, [generatedAt]);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !pending) {
        startTransition(() => {
          router.refresh();
        });
      }
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [autoRefresh, pending, router]);

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="space-y-1">
        <p className="text-slate-700 dark:text-slate-200">
          {ready
            ? `Reporting time zone: ${timeZone}`
            : "Detecting your time zone..."}
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {updatedLabel
            ? `Last refreshed: ${updatedLabel}`
            : "Loading refresh time..."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
            className="accent-teal-600"
          />
          Refresh every minute
        </label>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(() => {
              router.refresh();
            });
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {pending ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}
