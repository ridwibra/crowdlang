"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DashboardSummary = {
  usersCount: number;
  languagesCount: number;
  pendingRequestsCount: number;
  latestChatbotCallAt: string | null;
};

const adminTools = [
  {
    href: "/admin/users",
    title: "Users",
    description:
      "View accounts, manage global roles, and review user information.",
    color:
      "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30",
    iconColor: "bg-blue-500",
  },
  {
    href: "/admin/languages",
    title: "Languages",
    description:
      "Create, edit, archive, and manage supported language records.",
    color:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30",
    iconColor: "bg-emerald-500",
  },
  {
    href: "/admin/languagerolerequests",
    title: "Language Role Requests",
    description:
      "Approve or reject requests for editor and expert language roles.",
    color:
      "border-purple-200 bg-purple-50 dark:border-purple-900/60 dark:bg-purple-950/30",
    iconColor: "bg-purple-500",
  },
  {
    href: "/admin/activitytracker",
    title: "Activity Tracker",
    description: "Review login history, logout events, and account activity.",
    color:
      "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
    iconColor: "bg-amber-500",
  },
  {
    href: "/admin/chatbotcall",
    title: "Chatbot Calls",
    description: "Monitor chatbot usage, requests, and related call records.",
    color:
      "border-cyan-200 bg-cyan-50 dark:border-cyan-900/60 dark:bg-cyan-950/30",
    iconColor: "bg-cyan-500",
  },
  {
    href: "/admin/essays",
    title: "Essays",
    description:
      "Review essay submissions, filter by status, and publish or reject content.",
    color:
      "border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/30",
    iconColor: "bg-violet-500",
  },
  {
    href: "/admin/marquee",
    title: "Marquee",
    description:
      "Create, edit, activate, and remove announcement messages shown on the site.",
    color:
      "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30",
    iconColor: "bg-rose-500",
  },
];

function formatDate(value: string | null) {
  if (!value) return "No chatbot calls recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

export default function AdminPage() {
  const [summary, setSummary] = useState<DashboardSummary>({
    usersCount: 0,
    languagesCount: 0,
    pendingRequestsCount: 0,
    latestChatbotCallAt: null,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/dashboard", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load dashboard summary.");
        }

        if (mounted) {
          setSummary({
            usersCount: data.usersCount || 0,
            languagesCount: data.languagesCount || 0,
            pendingRequestsCount: data.pendingRequestsCount || 0,
            latestChatbotCallAt: data.latestChatbotCallAt || null,
          });
        }
      } catch (error) {
        if (mounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load dashboard summary.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/50 bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
          Control Center
        </p>

        <h1 className="mt-2 bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:from-teal-300 dark:to-cyan-300">
          Admin Dashboard
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Manage users, language content, contribution access requests, platform
          activity, and chatbot usage from one place.
        </p>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Platform Overview
          </h2>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Current totals and recent chatbot activity.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/admin/users"
            className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-blue-900/60 dark:bg-blue-950/30"
          >
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Total Users
            </p>

            <p className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-white">
              {loading ? "—" : summary.usersCount.toLocaleString()}
            </p>

            <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300">
              Manage users →
            </p>
          </Link>

          <Link
            href="/admin/languages"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-emerald-900/60 dark:bg-emerald-950/30"
          >
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Total Languages
            </p>

            <p className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-white">
              {loading ? "—" : summary.languagesCount.toLocaleString()}
            </p>

            <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300">
              Manage languages →
            </p>
          </Link>

          <Link
            href="/admin/languagerolerequests"
            className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-purple-900/60 dark:bg-purple-950/30"
          >
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              Pending Role Requests
            </p>

            <p className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-white">
              {loading ? "—" : summary.pendingRequestsCount.toLocaleString()}
            </p>

            <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300">
              Review pending requests →
            </p>
          </Link>

          <Link
            href="/admin/chatbotcall"
            className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-cyan-900/60 dark:bg-cyan-950/30"
          >
            <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Latest Chatbot Call
            </p>

            <p className="mt-3 text-lg font-extrabold leading-7 text-slate-900 dark:text-white">
              {loading ? "Loading..." : formatDate(summary.latestChatbotCallAt)}
            </p>

            <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300">
              View chatbot calls →
            </p>
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Management Tools
          </h2>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Select an area to begin managing your platform.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {adminTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group rounded-2xl border p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${tool.color}`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold text-white ${tool.iconColor}`}
              >
                {tool.title.charAt(0)}
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                {tool.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {tool.description}
              </p>

              <p className="mt-5 text-sm font-bold text-teal-700 transition group-hover:translate-x-1 dark:text-teal-300">
                Open section →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
