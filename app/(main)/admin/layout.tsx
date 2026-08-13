"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type GlobalRole = "user" | "staff" | "admin";

const adminNavigation = [
  {
    href: "/admin",
    label: "Dashboard",
  },
  {
    href: "/admin/users",
    label: "Users",
  },
  {
    href: "/admin/languages",
    label: "Languages",
  },
  {
    href: "/admin/languagerolerequests",
    label: "Language Role Requests",
  },
  {
    href: "/admin/activitytracker",
    label: "Activity Tracker",
  },
  {
    href: "/admin/chatbotcall",
    label: "Chatbot Calls",
  },
  {
    href: "/admin/essays",
    label: "Essays",
  },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: session, isPending } = authClient.useSession();

  const role = (
    session?.user as
      | {
          role?: GlobalRole;
        }
      | undefined
  )?.role;

  const hasAdminAccess = role === "admin" || role === "staff";

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!hasAdminAccess) {
      router.replace("/unauthorized");
    }
  }, [isPending, session, hasAdminAccess, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 pt-24 text-lg text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Checking admin access...
      </div>
    );
  }

  if (!session || !hasAdminAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 pt-24 text-lg text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-slate-200 px-4 pb-16 pt-24 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
        <aside className="w-full rounded-3xl border border-white/50 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 lg:w-72 lg:shrink-0">
          <div className="mb-7 border-b border-slate-200 pb-5 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              Admin Panel
            </h1>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Signed in as{" "}
              <span className="font-semibold capitalize text-teal-700 dark:text-teal-300">
                {role}
              </span>
            </p>
          </div>

          <nav className="space-y-2">
            {adminNavigation.map((item) => {
              const active = isActiveRoute(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-teal-500 text-white shadow-md"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-7 border-t border-slate-200 pt-5 dark:border-slate-700">
            <Link
              href="/profile"
              className="block rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back to Profile
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
