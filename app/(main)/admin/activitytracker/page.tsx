import ActivityChart, {
  type ActivityChartPoint,
} from "@/components/ActivityChart";
import { auth } from "@/lib/auth";
import Tracker from "@/models/Tracker";
import User from "@/models/User";
import db from "@/utils/db";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

type GlobalRole = "user" | "staff" | "admin";

type ActivityRange = "day" | "week" | "month" | "year" | "all";

type SearchParams = {
  q?: string;
  range?: ActivityRange;
};

type PopulatedUser = {
  _id?: {
    toString(): string;
  };
  name?: string;
  email?: string;
};

type ActivityRecord = {
  _id: {
    toString(): string;
  };
  userId?: PopulatedUser | null;
  actionType?: string;
  pathname?: string;
  duration?: number;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

const RANGE_OPTIONS: Array<{
  value: ActivityRange;
  label: string;
}> = [
  {
    value: "day",
    label: "1 day",
  },
  {
    value: "week",
    label: "1 week",
  },
  {
    value: "month",
    label: "1 month",
  },
  {
    value: "year",
    label: "1 year",
  },
  {
    value: "all",
    label: "All",
  },
];

const RANGE_LABELS: Record<ActivityRange, string> = {
  day: "1 day",
  week: "1 week",
  month: "1 month",
  year: "1 year",
  all: "all time",
};

const formatTimestamp = (date: Date | string | null | undefined) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(parsedDate);
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRangeStart(range: ActivityRange) {
  if (range === "all") return null;

  const now = new Date();

  if (range === "day") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  if (range === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (range === "month") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return start;
  }

  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 1);
  return start;
}

function getBucketUnit(range: ActivityRange) {
  if (range === "day") return "hour" as const;

  if (range === "week" || range === "month") {
    return "day" as const;
  }

  return "month" as const;
}

function formatChartLabel(date: Date, range: ActivityRange) {
  if (range === "day") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
    }).format(date);
  }

  if (range === "week") {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  if (range === "month") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function getRangeHref(range: ActivityRange, searchQuery: string) {
  if (!searchQuery) {
    return `/admin/activitytracker?range=${range}`;
  }

  return `/admin/activitytracker?range=${range}&q=${encodeURIComponent(
    searchQuery,
  )}`;
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const role = (session?.user as { role?: GlobalRole } | undefined)?.role;

  if (!session?.user || (role !== "admin" && role !== "staff")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;

  const searchQuery =
    typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";

  const requestedRange = params.range;

  const range: ActivityRange =
    requestedRange === "day" ||
    requestedRange === "week" ||
    requestedRange === "month" ||
    requestedRange === "year" ||
    requestedRange === "all"
      ? requestedRange
      : "week";

  try {
    await db.connect();

    const rangeStart = getRangeStart(range);

    const activityDateMatch = rangeStart
      ? {
          createdAt: {
            $gte: rangeStart,
          },
        }
      : {};

    const chartAggregation = await Tracker.aggregate([
      {
        $match: activityDateMatch,
      },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: "$createdAt",
              unit: getBucketUnit(range),
              timezone: "UTC",
            },
          },
          total: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const chartData: ActivityChartPoint[] = chartAggregation.map((item) => ({
      label: formatChartLabel(new Date(item._id), range),
      total: Number(item.total) || 0,
    }));

    let activities: ActivityRecord[] = [];

    if (searchQuery) {
      const safeSearchQuery = escapeRegex(searchQuery);

      const matchedUsers = await User.find({
        $or: [
          {
            name: {
              $regex: safeSearchQuery,
              $options: "i",
            },
          },
          {
            email: {
              $regex: safeSearchQuery,
              $options: "i",
            },
          },
        ],
      })
        .select("_id")
        .lean();

      const userIds = matchedUsers.map((user) => user._id);

      if (userIds.length > 0) {
        activities = (await Tracker.find({
          userId: {
            $in: userIds,
          },
        })
          .populate("userId", "name email")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean()) as unknown as ActivityRecord[];
      }
    } else {
      activities = (await Tracker.find()
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()) as unknown as ActivityRecord[];
    }

    return (
      <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Administration
          </p>

          <h1 className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">
            User Activity Logs
          </h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Review activity trends, then search individual records by a
            user&apos;s name or email address.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => {
            const isActive = option.value === range;

            return (
              <Link
                key={option.value}
                href={getRangeHref(option.value, searchQuery)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-teal-600 text-white shadow-sm"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        <ActivityChart data={chartData} rangeLabel={RANGE_LABELS[range]} />

        <form
          action="/admin/activitytracker"
          method="GET"
          className="mb-6 flex flex-col gap-3 sm:flex-row"
        >
          <input type="hidden" name="range" value={range} />

          <label htmlFor="q" className="sr-only">
            Search by user name or email
          </label>

          <input
            id="q"
            name="q"
            type="search"
            defaultValue={searchQuery}
            placeholder="Search by name or email..."
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />

          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Search
          </button>

          {searchQuery && (
            <Link
              href={`/admin/activitytracker?range=${range}`}
              className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear
            </Link>
          )}
        </form>

        {searchQuery && (
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Search results for{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              “{searchQuery}”
            </span>
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
            <thead className="bg-gray-50 dark:bg-neutral-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  User
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Action
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Page
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Duration
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Created At
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Updated At
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white dark:divide-neutral-700 dark:bg-neutral-900">
              {activities.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {searchQuery
                      ? "No activity records were found for this user."
                      : "No user activity has been recorded yet."}
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr
                    key={act._id.toString()}
                    className="hover:bg-gray-50 dark:hover:bg-neutral-800"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                      <div>{act.userId?.name || "Guest"}</div>

                      {act.userId?.email && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {act.userId.email}
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                      {act.actionType || "—"}
                    </td>

                    <td className="max-w-xs truncate px-6 py-4 text-sm text-blue-600 dark:text-blue-400">
                      {act.pathname || "—"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                      {typeof act.duration === "number"
                        ? `${act.duration} sec`
                        : "—"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatTimestamp(act.createdAt)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatTimestamp(act.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!searchQuery && activities.length > 0 && (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Showing the latest 100 activity records. Use search to narrow
            records to one user.
          </p>
        )}
      </div>
    );
  } catch (error) {
    console.error("Failed to load user activity logs:", error);

    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-xl dark:border-red-900/60 dark:bg-red-950/30">
        <h1 className="text-2xl font-bold text-red-700 dark:text-red-300">
          Unable to load activity logs
        </h1>

        <p className="mt-3 text-sm text-red-600 dark:text-red-200">
          The activity tracker could not load its database records. Please try
          again shortly.
        </p>
      </div>
    );
  }
}
