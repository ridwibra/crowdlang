"use client";

import { LogoutButton } from "@/components/auth/LogoutButton";
import LanguageRoleRequestForm from "@/components/LanguageRoleRequestForm";
import { authClient } from "@/lib/auth-client";
import { deleteMedia } from "@/utils/files/requests";
import { UserType } from "@/utils/types";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AvatarValue = {
  image_url: string;
  public_id: string | null;
} | null;

type LanguageRole = "user" | "editor" | "expert";

type ActivityUser = Partial<UserType> & {
  lastLogin?: string | Date | null;
  lastLogout?: string | Date | null;
  lastLogins?: unknown;
  lastLogouts?: unknown;
  avatar?: unknown;
  image?: string | null;
  createdAt?: string | Date;
  languageRoles?: unknown;
};

function parseMaybeJSON<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

function normalizeAvatar(avatar: unknown): AvatarValue {
  const parsed = parseMaybeJSON<any>(avatar, null);

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  return {
    image_url: typeof parsed.image_url === "string" ? parsed.image_url : "",
    public_id: typeof parsed.public_id === "string" ? parsed.public_id : null,
  };
}

function normalizeLanguageRoles(value: unknown): Record<string, LanguageRole> {
  const parsed = parseMaybeJSON<unknown>(value, {});

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const allowedRoles: LanguageRole[] = ["user", "editor", "expert"];

  return Object.entries(parsed as Record<string, unknown>).reduce(
    (result, [languageName, role]) => {
      if (
        typeof languageName === "string" &&
        typeof role === "string" &&
        allowedRoles.includes(role as LanguageRole)
      ) {
        result[languageName] = role as LanguageRole;
      }

      return result;
    },
    {} as Record<string, LanguageRole>,
  );
}

function parseUserAgent(userAgent: string) {
  if (!userAgent) {
    return {
      browser: "Unknown browser",
      os: "Unknown device",
    };
  }

  const browserMatch =
    userAgent.match(/Edg\/([\d.]+)/) ||
    userAgent.match(/Chrome\/([\d.]+)/) ||
    userAgent.match(/Firefox\/([\d.]+)/) ||
    userAgent.match(/Safari\/([\d.]+)/);

  return {
    browser: browserMatch
      ? browserMatch[0].replace("/", " ")
      : "Unknown browser",
    os: userAgent.match(/\(([^)]+)\)/)?.[1] || "Unknown device",
  };
}

function formatDate(date: string | Date) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown";
  }

  return parsedDate.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
}

function getRoleClass(role: LanguageRole) {
  if (role === "expert") {
    return "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300";
  }

  if (role === "editor") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  }

  return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
}

export default function ProfilePage() {
  const { data: sessionData, isPending, error } = authClient.useSession();

  const [fullUser, setFullUser] = useState<ActivityUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [activeSection, setActiveSection] = useState<
    "profile" | "requests" | "session" | "activity"
  >("profile");

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        setUserLoading(true);

        const response = await fetch("/api/activity/me", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!mounted) return;

        if (!response.ok) {
          throw new Error(data.message || "Failed to load profile.");
        }

        setFullUser(data.user ?? null);
      } catch {
        if (mounted) {
          setFullUser(null);
        }
      } finally {
        if (mounted) {
          setUserLoading(false);
        }
      }
    };

    if (sessionData?.user) {
      loadUser();
    } else {
      setUserLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [sessionData?.user]);

  const rawUserAgent = sessionData?.session?.userAgent ?? "";

  const { browser, os } = useMemo(
    () => parseUserAgent(rawUserAgent),
    [rawUserAgent],
  );

  if (isPending || userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24 text-lg text-gray-600 dark:text-gray-300">
        Loading your profile...
      </div>
    );
  }

  if (error || !sessionData?.user || !sessionData?.session) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24 text-lg text-gray-600 dark:text-gray-300">
        Not signed in
      </div>
    );
  }

  const sessionUser = sessionData.user as ActivityUser;

  const user: ActivityUser = {
    ...sessionUser,
    ...fullUser,
  };

  const avatar = normalizeAvatar(user.avatar);

  const avatarSrc =
    avatar?.image_url || user.image || "/images/default-avatar.png";

  const normalizedLanguageRoles = normalizeLanguageRoles(user.languageRoles);

  const languageRoleEntries = Object.entries(normalizedLanguageRoles).sort(
    ([languageA], [languageB]) => languageA.localeCompare(languageB),
  );

  const loginDates = parseMaybeJSON<(string | Date)[]>(user.lastLogins, [])
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())
    .slice(0, 5);

  const logoutDates = parseMaybeJSON<(string | Date)[]>(user.lastLogouts, [])
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())
    .slice(0, 5);

  const displayName = user.name?.trim() || "User";

  const lastRecordedLogin = user.lastLogin
    ? formatDate(user.lastLogin)
    : "No login recorded";

  const lastRecordedLogout = user.lastLogout
    ? formatDate(user.lastLogout)
    : "No logout recorded";

  const createdAt = user.createdAt ? formatDate(user.createdAt) : "Unknown";

  const handleDelete = async () => {
    const confirmed = confirm(
      "Permanently delete your account? This cannot be undone.",
    );

    if (!confirmed) return;

    setLoadingDelete(true);

    try {
      const avatarPublicId = avatar?.public_id ?? null;

      const { error: deleteError } = await authClient.deleteUser();

      if (deleteError) {
        throw new Error(deleteError.message || "Failed to delete account.");
      }

      if (avatarPublicId) {
        try {
          await deleteMedia(avatarPublicId);
        } catch (cleanupError) {
          console.warn(
            "Account deleted but avatar cleanup failed:",
            cleanupError,
          );
        }
      }

      toast.success("Your account has been successfully deleted.");
      window.location.href = "/";
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Account deletion failed.",
      );
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 px-4 pb-16 pt-24 dark:from-slate-950 dark:to-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row">
        <aside className="w-full rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl dark:border-white/10 dark:bg-slate-900/70 lg:w-64 lg:shrink-0">
          <nav className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveSection("profile")}
              className={`w-full rounded-xl px-4 py-3 text-left font-semibold transition ${
                activeSection === "profile"
                  ? "bg-teal-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Profile Overview
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("requests")}
              className={`w-full rounded-xl px-4 py-3 text-left font-semibold transition ${
                activeSection === "requests"
                  ? "bg-teal-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Request Language Role
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("session")}
              className={`w-full rounded-xl px-4 py-3 text-left font-semibold transition ${
                activeSection === "session"
                  ? "bg-teal-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Session Details
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("activity")}
              className={`w-full rounded-xl px-4 py-3 text-left font-semibold transition ${
                activeSection === "activity"
                  ? "bg-teal-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Activity Feed
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loadingDelete}
              className="w-full rounded-xl border border-red-500 px-4 py-3 text-left font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
            >
              {loadingDelete ? "Deleting..." : "Delete Account"}
            </button>
          </nav>
        </aside>

        <main className="flex-1">
          {activeSection === "profile" && (
            <section className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-10">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:from-teal-300 dark:to-cyan-300">
                  My Profile
                </h1>

                <div className="flex items-center gap-3">
                  <Link
                    href="/editprofile"
                    className="rounded-xl bg-teal-500 px-4 py-2 font-medium text-white transition hover:bg-teal-600"
                  >
                    Edit Profile
                  </Link>

                  <LogoutButton />
                </div>
              </div>

              <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
                <div className="relative h-32 w-32 overflow-hidden rounded-full">
                  <Image
                    src={avatarSrc}
                    alt={`${displayName}'s avatar`}
                    fill
                    sizes="128px"
                    className="border-4 border-teal-400 object-cover shadow-xl"
                  />
                </div>

                <div className="space-y-2 text-center md:text-left">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {displayName}
                  </h2>

                  <p className="text-gray-600 dark:text-gray-300">
                    {user.email || "No email"}
                  </p>

                  <p
                    className={`text-sm font-medium ${
                      user.emailVerified
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {user.emailVerified
                      ? "Email Verified"
                      : "Email Not Verified"}
                  </p>

                  {user.bio && (
                    <p className="pt-1 text-sm text-gray-700 dark:text-gray-300">
                      {user.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="my-8 border-t border-gray-200 dark:border-gray-700" />

              <div className="mb-8">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
                  Language Roles
                </p>

                {languageRoleEntries.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {languageRoleEntries.map(([languageName, languageRole]) => (
                      <div
                        key={languageName}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {languageName}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getRoleClass(
                            languageRole,
                          )}`}
                        >
                          {languageRole}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    No language-specific roles have been assigned yet.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-8 text-sm md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
                    Global Role
                  </p>

                  <p className="capitalize text-gray-600 dark:text-gray-300">
                    {user.role || "user"}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
                    Current Session
                  </p>

                  <p className="font-medium text-green-600 dark:text-green-400">
                    Active
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
                    Last Recorded Login
                  </p>

                  <p className="text-gray-600 dark:text-gray-300">
                    {lastRecordedLogin}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
                    Last Recorded Logout
                  </p>

                  <p className="text-gray-600 dark:text-gray-300">
                    {lastRecordedLogout}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
                    Account Created
                  </p>

                  <p className="text-gray-600 dark:text-gray-300">
                    {createdAt}
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeSection === "requests" && (
            <LanguageRoleRequestForm languageRoles={normalizedLanguageRoles} />
          )}

          {activeSection === "session" && (
            <section className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-10">
              <h2 className="mb-6 text-2xl font-bold text-cyan-600 dark:text-cyan-300">
                Current Session Details
              </h2>

              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Status:
                  </strong>{" "}
                  <span className="font-medium text-green-600 dark:text-green-400">
                    Active
                  </span>
                </p>

                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Device:
                  </strong>{" "}
                  {os}
                </p>

                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Browser:
                  </strong>{" "}
                  {browser}
                </p>

                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Session Expires:
                  </strong>{" "}
                  {sessionData.session.expiresAt
                    ? formatDate(sessionData.session.expiresAt)
                    : "Unknown"}
                </p>

                <p>
                  <strong className="text-gray-900 dark:text-white">
                    IP Address:
                  </strong>{" "}
                  Hidden for security
                </p>
              </div>
            </section>
          )}

          {activeSection === "activity" && (
            <section className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-10">
              <h2 className="mb-2 text-2xl font-bold text-teal-600 dark:text-teal-300">
                Activity History
              </h2>

              <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
                Login and logout times are recorded events. They can come from
                different browser sessions or devices, so they should not be
                interpreted as a single session pair.
              </p>

              <div className="grid grid-cols-1 gap-8 text-sm md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
                    Recent Recorded Logins
                  </p>

                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    {loginDates.length > 0 ? (
                      loginDates.map((date, index) => (
                        <li key={`${date.getTime()}-${index}`}>
                          {formatDate(date)}
                        </li>
                      ))
                    ) : (
                      <li>No login history</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
                    Recent Recorded Logouts
                  </p>

                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    {logoutDates.length > 0 ? (
                      logoutDates.map((date, index) => (
                        <li key={`${date.getTime()}-${index}`}>
                          {formatDate(date)}
                        </li>
                      ))
                    ) : (
                      <li>No logout history</li>
                    )}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
