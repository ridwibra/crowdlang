"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type UserRole = "user" | "staff" | "admin";

type UserItem = {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  createdAt?: string;
  emailVerified?: boolean;
};

type UsersApiResponse = {
  users?: UserItem[];
  error?: string;
  message?: string;
};

type AuthSessionUser = {
  role?: UserRole;
};

const ROLE_OPTIONS: UserRole[] = ["user", "staff", "admin"];

function getRoleBadgeClass(role: UserRole) {
  if (role === "admin") {
    return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }

  if (role === "staff") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getRoleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";

  return "User";
}

function formatCreatedAt(value?: string) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: session, isPending } = authClient.useSession();

  const role = (session?.user as AuthSessionUser | undefined)?.role;

  const hasAdminAccess = role === "admin" || role === "staff";

  useEffect(() => {
    if (isPending) return;

    if (!session || !hasAdminAccess) {
      router.replace("/unauthorized");
    }
  }, [hasAdminAccess, isPending, router, session]);

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);

      const response = await fetch("/api/users", {
        cache: "no-store",
        signal,
      });

      const data: UsersApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to load users.");
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to load users.",
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isPending) return;

    if (!session || !hasAdminAccess) {
      return;
    }

    const controller = new AbortController();

    void loadUsers(controller.signal);

    return () => {
      controller.abort();
    };
  }, [hasAdminAccess, isPending, loadUsers, session]);

  const handleRoleChange = async (userId: string, nextRole: UserRole) => {
    setSavingId(userId);

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: nextRole,
        }),
      });

      const data: UsersApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Failed to update user role.",
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user._id === userId
            ? {
                ...user,
                role: nextRole,
              }
            : user,
        ),
      );

      toast.success(`User role changed to ${getRoleLabel(nextRole)}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user role.",
      );
    } finally {
      setSavingId(null);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />

          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Loading users...
          </span>
        </div>
      </div>
    );
  }

  if (!session || !hasAdminAccess) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-3xl border border-white/50 bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 transition hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
        >
          <span aria-hidden="true">←</span>
          Back to Admin Dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              User administration
            </p>

            <h1 className="mt-2 bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:from-teal-300 dark:to-cyan-300">
              Users
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Review user accounts and manage their global platform roles. Role
              changes take effect immediately after saving.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
          >
            Refresh users
          </button>
        </div>
      </section>

      {/* Overview */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Total users
          </p>

          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {users.length}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Staff members
          </p>

          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {users.filter((user) => user.role === "staff").length}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            Administrators
          </p>

          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {users.filter((user) => user.role === "admin").length}
          </p>
        </div>
      </section>

      {/* User list */}
      <section className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              User Accounts
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {users.length} {users.length === 1 ? "account" : "accounts"}{" "}
              available
            </p>
          </div>

          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
            Global role management
          </span>
        </div>

        <div className="hidden border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400 md:grid md:grid-cols-[1.5fr_2fr_1fr_1fr_0.8fr]">
          <div>User</div>
          <div>Email</div>
          <div>Role</div>
          <div>Change role</div>
          <div>Joined</div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {users.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <User className="h-6 w-6" />
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white">
                No users found
              </h3>

              <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                User accounts will appear here once they are created.
              </p>
            </div>
          ) : (
            users.map((user) => (
              <article
                key={user._id}
                className="grid grid-cols-1 gap-4 px-5 py-5 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 md:grid-cols-[1.5fr_2fr_1fr_1fr_0.8fr] md:items-center md:px-6"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-slate-300">
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" strokeWidth={2.2} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {user.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {user.emailVerified
                        ? "Email verified"
                        : "Email not verified"}
                    </p>
                  </div>
                </div>

                <div className="truncate text-sm text-slate-600 dark:text-slate-300">
                  {user.email}
                </div>

                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${getRoleBadgeClass(
                      user.role,
                    )}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </div>

                <div>
                  <select
                    value={user.role}
                    disabled={savingId === user._id}
                    onChange={(event) =>
                      void handleRoleChange(
                        user._id,
                        event.target.value as UserRole,
                      )
                    }
                    className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    aria-label={`Change role for ${user.name}`}
                  >
                    {ROLE_OPTIONS.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {getRoleLabel(roleOption)}
                      </option>
                    ))}
                  </select>

                  {savingId === user._id && (
                    <p className="mt-2 text-xs font-medium text-teal-600 dark:text-teal-300">
                      Saving role...
                    </p>
                  )}
                </div>

                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {formatCreatedAt(user.createdAt)}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
