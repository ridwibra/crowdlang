"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Opening your language workspace...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isWorkspaceHome = pathname === "/workspace";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-100 px-4 pb-16 pt-24 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
        <aside className="w-full rounded-3xl border border-white/50 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 lg:w-72 lg:shrink-0">
          <div className="mb-7 border-b border-slate-200 pb-5 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Contributor area
            </p>

            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              Language Workspace
            </h1>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Manage your assigned language content.
            </p>
          </div>

          <nav className="space-y-2">
            <Link
              href="/workspace"
              className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isWorkspaceHome
                  ? "bg-teal-500 text-white shadow-md"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              My Languages
            </Link>

            <Link
              href="/profile"
              className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back to Profile
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
