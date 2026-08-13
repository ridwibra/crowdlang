"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "lucide-react";
import { toast } from "sonner";

type GlobalRole = "user" | "staff" | "admin";
type LanguageRole = "user" | "editor" | "expert";

type LanguageItem = {
  _id: string;
  name: string;
  countries: string[];
  status: "active" | "archived";
};

type LanguageUser = {
  _id: string;
  name: string;
  email: string;
  image?: string;
  globalRole: GlobalRole;
  languageRole: LanguageRole;
  emailVerified?: boolean;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const ROLE_OPTIONS: LanguageRole[] = ["user", "editor", "expert"];

const LANGUAGE_STATUS_OPTIONS: LanguageItem["status"][] = [
  "active",
  "archived",
];

const USERS_PER_PAGE = 20;

function getLanguageRoleClass(role: LanguageRole) {
  if (role === "expert") {
    return "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300";
  }

  if (role === "editor") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-300";
}

export default function LanguagesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [languageSearch, setLanguageSearch] = useState("");

  const [expandedLanguage, setExpandedLanguage] = useState<string | null>(null);

  const [languageUsers, setLanguageUsers] = useState<LanguageUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: USERS_PER_PAGE,
    total: 0,
    totalPages: 0,
  });

  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  const globalRole = (
    session?.user as
      | {
          role?: GlobalRole;
        }
      | undefined
  )?.role;

  const canManageLanguages = globalRole === "admin" || globalRole === "staff";
  const isAdmin = globalRole === "admin";

  const filteredLanguages = useMemo(() => {
    const query = languageSearch.trim().toLowerCase();

    if (!query) {
      return languages;
    }

    return languages.filter((language) => {
      const countries = language.countries.join(" ").toLowerCase();

      return (
        language.name.toLowerCase().includes(query) ||
        countries.includes(query) ||
        language.status.toLowerCase().includes(query)
      );
    });
  }, [languages, languageSearch]);

  const resetExpandedLanguage = () => {
    setExpandedLanguage(null);
    setLanguageUsers([]);
    setUserSearch("");

    setPagination({
      page: 1,
      limit: USERS_PER_PAGE,
      total: 0,
      totalPages: 0,
    });
  };

  useEffect(() => {
    if (isPending) return;

    if (!session || !canManageLanguages) {
      router.replace("/unauthorized");
    }
  }, [isPending, session, canManageLanguages, router]);

  useEffect(() => {
    if (isPending || !session || !canManageLanguages) return;

    let mounted = true;

    const loadLanguages = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/languages", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load languages.");
        }

        if (mounted) {
          setLanguages(data.languages || []);
        }
      } catch (error) {
        if (mounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load languages.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadLanguages();

    return () => {
      mounted = false;
    };
  }, [isPending, session, canManageLanguages]);

  const loadLanguageUsers = useCallback(
    async (
      languageId: string,
      searchValue = "",
      page = 1,
      appendUsers = false,
    ) => {
      try {
        if (appendUsers) {
          setLoadingMoreUsers(true);
        } else {
          setLoadingUsers(true);
        }

        const query = new URLSearchParams({
          q: searchValue.trim(),
          page: String(page),
          limit: String(USERS_PER_PAGE),
        });

        const response = await fetch(
          `/api/languages/${languageId}/users?${query.toString()}`,
          {
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load language users.");
        }

        const nextUsers: LanguageUser[] = data.users || [];

        setLanguageUsers((previousUsers) =>
          appendUsers ? [...previousUsers, ...nextUsers] : nextUsers,
        );

        setPagination(
          data.pagination || {
            page,
            limit: USERS_PER_PAGE,
            total: nextUsers.length,
            totalPages: 1,
          },
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load language users.",
        );
      } finally {
        setLoadingUsers(false);
        setLoadingMoreUsers(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!expandedLanguage) return;

    const timeout = window.setTimeout(() => {
      loadLanguageUsers(expandedLanguage, userSearch, 1, false);
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [expandedLanguage, userSearch, loadLanguageUsers]);

  const toggleExpand = (languageId: string) => {
    if (expandedLanguage === languageId) {
      resetExpandedLanguage();
      return;
    }

    setLanguageUsers([]);
    setUserSearch("");

    setPagination({
      page: 1,
      limit: USERS_PER_PAGE,
      total: 0,
      totalPages: 0,
    });

    setExpandedLanguage(languageId);
  };

  const loadMoreUsers = () => {
    if (!expandedLanguage || loadingMoreUsers) return;
    if (pagination.page >= pagination.totalPages) return;

    loadLanguageUsers(expandedLanguage, userSearch, pagination.page + 1, true);
  };

  const handleLanguageSearch = (value: string) => {
    setLanguageSearch(value);

    if (expandedLanguage) {
      resetExpandedLanguage();
    }
  };

  const handleRoleChange = async (
    languageId: string,
    userId: string,
    newRole: LanguageRole,
  ) => {
    if (!isAdmin) {
      toast.error("Only admins can update language roles.");
      return;
    }

    setSavingRoleId(userId);

    try {
      const response = await fetch(
        `/api/languages/${languageId}/users/${userId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: newRole,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update language role.");
      }

      setLanguageUsers((previousUsers) =>
        previousUsers.map((user) =>
          user._id === userId
            ? {
                ...user,
                languageRole: newRole,
              }
            : user,
        ),
      );

      toast.success("Language role updated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update language role.",
      );
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleStatusChange = async (
    languageId: string,
    newStatus: LanguageItem["status"],
  ) => {
    if (!isAdmin) {
      toast.error("Only admins can update language status.");
      return;
    }

    setSavingStatusId(languageId);

    try {
      const response = await fetch(`/api/languages/${languageId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update language status.");
      }

      setLanguages((previousLanguages) =>
        previousLanguages.map((language) =>
          language._id === languageId
            ? {
                ...language,
                status: newStatus,
              }
            : language,
        ),
      );

      toast.success("Language status updated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update language status.",
      );
    } finally {
      setSavingStatusId(null);
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="flex items-center gap-3 rounded-xl border px-6 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <span className="text-sm font-medium">Checking access...</span>
        </div>
      </div>
    );
  }

  if (!session || !canManageLanguages) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="flex items-center gap-3 rounded-xl border px-6 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading languages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 pt-24 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl rounded-3xl border bg-white/80 p-6 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 sm:p-8">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
          >
            ← Back to Admin
          </Link>

          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Admin Panel
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
            Languages
          </h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Manage language status and user language roles.
          </p>
        </div>

        <div className="mb-6">
          <label
            htmlFor="language-search"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Search Languages
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="language-search"
              type="search"
              value={languageSearch}
              onChange={(event) => handleLanguageSearch(event.target.value)}
              placeholder="Search by language, country, or status..."
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-slate-500"
            />

            {languageSearch.trim() && (
              <button
                type="button"
                onClick={() => handleLanguageSearch("")}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800"
              >
                Clear
              </button>
            )}
          </div>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredLanguages.length} of {languages.length} language
            {languages.length === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="hidden border-b bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-300 md:grid md:grid-cols-[2fr_2fr_1fr_1fr]">
            <div>Name</div>
            <div>Countries/Territories</div>
            <div>Status</div>
            <div>Manage</div>
          </div>

          <div className="divide-y dark:divide-neutral-700">
            {filteredLanguages.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-300">
                {languageSearch.trim()
                  ? `No languages match "${languageSearch}".`
                  : "No languages found."}
              </div>
            ) : (
              filteredLanguages.map((language) => (
                <div key={language._id}>
                  <div className="grid grid-cols-1 gap-4 px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800 md:grid-cols-[2fr_2fr_1fr_1fr]">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {language.name}
                      </p>
                    </div>

                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {language.countries.length > 0
                        ? language.countries.join(", ")
                        : "—"}
                    </div>

                    <div>
                      <select
                        value={language.status}
                        disabled={!isAdmin || savingStatusId === language._id}
                        onChange={(event) =>
                          handleStatusChange(
                            language._id,
                            event.target.value as LanguageItem["status"],
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm capitalize text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                      >
                        {LANGUAGE_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      {!isAdmin && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Admin only
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(language._id)}
                      className="w-fit text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                    >
                      {expandedLanguage === language._id
                        ? "Hide Users ↑"
                        : "View Users ↓"}
                    </button>
                  </div>

                  {expandedLanguage === language._id && (
                    <div className="bg-slate-50/50 px-6 py-5 dark:bg-neutral-800/40">
                      <div className="mb-5">
                        <label
                          htmlFor={`user-search-${language._id}`}
                          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                        >
                          Search users for {language.name}
                        </label>

                        <input
                          id={`user-search-${language._id}`}
                          type="search"
                          value={userSearch}
                          onChange={(event) =>
                            setUserSearch(event.target.value)
                          }
                          placeholder="Search by name or email address..."
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                        />

                        {!loadingUsers && (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {pagination.total === 0
                              ? userSearch.trim()
                                ? "No matching users found."
                                : "No users found."
                              : `${pagination.total} matching user${
                                  pagination.total === 1 ? "" : "s"
                                } found.`}
                          </p>
                        )}
                      </div>

                      {loadingUsers ? (
                        <div className="flex items-center gap-3 py-8">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Searching users...
                          </span>
                        </div>
                      ) : languageUsers.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                          {userSearch.trim()
                            ? `No users match "${userSearch}".`
                            : "No users found."}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            The selected role applies specifically to{" "}
                            <span className="font-semibold">
                              {language.name}
                            </span>
                            .
                          </p>

                          {languageUsers.map((user) => (
                            <div
                              key={user._id}
                              className="grid grid-cols-1 gap-4 rounded-xl border bg-white px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900 md:grid-cols-[1.5fr_2fr_1fr_1fr]"
                            >
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700">
                                  {user.image ? (
                                    <img
                                      src={user.image}
                                      alt={user.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-medium text-slate-900 dark:text-white">
                                    {user.name}
                                  </p>

                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {user.emailVerified
                                      ? "Verified"
                                      : "Not verified"}
                                  </p>
                                </div>
                              </div>

                              <div className="truncate text-sm text-slate-600 dark:text-slate-300">
                                {user.email}
                              </div>

                              <div>
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getLanguageRoleClass(
                                    user.languageRole,
                                  )}`}
                                >
                                  {user.languageRole}
                                </span>

                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Global role: {user.globalRole}
                                </p>
                              </div>

                              <div>
                                <select
                                  value={user.languageRole}
                                  disabled={
                                    !isAdmin || savingRoleId === user._id
                                  }
                                  onChange={(event) =>
                                    handleRoleChange(
                                      language._id,
                                      user._id,
                                      event.target.value as LanguageRole,
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm capitalize text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                                >
                                  {ROLE_OPTIONS.map((roleOption) => (
                                    <option key={roleOption} value={roleOption}>
                                      {roleOption}
                                    </option>
                                  ))}
                                </select>

                                {!isAdmin && (
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Admin only
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}

                          {pagination.page < pagination.totalPages && (
                            <div className="flex justify-center pt-2">
                              <button
                                type="button"
                                onClick={loadMoreUsers}
                                disabled={loadingMoreUsers}
                                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {loadingMoreUsers
                                  ? "Loading..."
                                  : `Load More (${
                                      pagination.total - languageUsers.length
                                    } remaining)`}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
