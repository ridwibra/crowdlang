import ActivityChart, {
  type ActivityChartPoint,
} from "@/components/ActivityChart";
import ActivityTrackerControls from "@/components/ActivityTrackerControls";
import { auth } from "@/lib/auth";
import Tracker from "@/models/Tracker";
import User from "@/models/User";
import db from "@/utils/db";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { PipelineStage, Types } from "mongoose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ActivityRange = "day" | "week" | "month" | "year" | "all";
type BucketUnit = "hour" | "day" | "month";

type SearchParams = {
  q?: string | string[];
  range?: string | string[];
  tz?: string | string[];
  page?: string | string[];
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
  isAuthenticated?: boolean;
  actionType?: string;
  pathname?: string;
  duration?: number;
  country?: string;
  countryCode?: string;
  city?: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type ActivityFilter = {
  createdAt: {
    $type: "date";
    $gte?: Date;
    $lte: Date;
  };
  userId?: {
    $in: Types.ObjectId[];
  };
};

type ReportResult = {
  total: number;
  authenticatedEvents: number;
  guestEvents: number;
  linkedUsers: number;
  sessions: number;
  series: Array<{
    date: Date;
    total: number;
  }>;
};

const PAGE_SIZE = 50;

const RANGE_OPTIONS: Array<{
  value: ActivityRange;
  label: string;
}> = [
  { value: "day", label: "Last 24 hours" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "year", label: "Last 365 days" },
  { value: "all", label: "All time" },
];

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseRange(value: string): ActivityRange {
  return ["day", "week", "month", "year", "all"].includes(value)
    ? (value as ActivityRange)
    : "week";
}

function parseTimeZone(value: string): string {
  if (!value || value.length > 100) return "UTC";

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function getRangeStart(range: ActivityRange, now: Date): Date | null {
  const days: Record<Exclude<ActivityRange, "all">, number> = {
    day: 1,
    week: 7,
    month: 30,
    year: 365,
  };

  return range === "all"
    ? null
    : new Date(now.getTime() - days[range] * 86_400_000);
}

function getBucketUnit(range: ActivityRange): BucketUnit {
  if (range === "day") return "hour";

  if (range === "week" || range === "month") {
    return "day";
  }

  return "month";
}

function formatTimestamp(
  value: Date | string | null | undefined,
  timeZone: string,
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(date);
}

function formatDuration(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "—";
  }

  const seconds = Math.round(value);

  if (seconds < 60) return `${seconds} sec`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes < 60) {
    return `${minutes} min ${remainder} sec`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours} hr ${minutes % 60} min`;
}

function buildHref(
  range: ActivityRange,
  query: string,
  timeZone: string,
  page = 1,
): string {
  const params = new URLSearchParams({
    range,
    tz: timeZone,
  });

  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));

  return `/admin/activitytracker?${params.toString()}`;
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const role = (session?.user as { role?: string } | undefined)?.role;

  // Preserve your existing dashboard access policy.
  if (!session?.user || (role !== "admin" && role !== "staff")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;

  const searchQuery = single(params.q).trim().slice(0, 100);
  const range = parseRange(single(params.range));
  const timeZone = parseTimeZone(single(params.tz));
  const bucketUnit = getBucketUnit(range);

  const requestedPageValue = Number(single(params.page) || "1");

  const requestedPage =
    Number.isSafeInteger(requestedPageValue) && requestedPageValue > 0
      ? requestedPageValue
      : 1;

  const now = new Date();
  const rangeStart = getRangeStart(range, now);

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === range)?.label ||
    "Last 7 days";

  try {
    await db.connect();

    const filter: ActivityFilter = {
      createdAt: {
        $type: "date",
        ...(rangeStart ? { $gte: rangeStart } : {}),
        $lte: now,
      },
    };

    if (searchQuery) {
      const safeQuery = escapeRegex(searchQuery);

      const matchedUsers = await User.find({
        $or: [
          {
            name: {
              $regex: safeQuery,
              $options: "i",
            },
          },
          {
            email: {
              $regex: safeQuery,
              $options: "i",
            },
          },
        ],
      })
        .select("_id")
        .lean();

      filter.userId = {
        $in: matchedUsers.map((user) => user._id as Types.ObjectId),
      };
    }

    const pipeline: PipelineStage[] = [
      {
        $match: filter,
      },
      {
        $facet: {
          buckets: [
            {
              $group: {
                _id: {
                  $dateTrunc: {
                    date: "$createdAt",
                    unit: bucketUnit,
                    timezone: timeZone,
                  },
                },
                total: { $sum: 1 },
              },
            },
            {
              $sort: { _id: 1 },
            },
          ],

          stats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                authenticatedEvents: {
                  $sum: {
                    $cond: [{ $eq: ["$isAuthenticated", true] }, 1, 0],
                  },
                },
              },
            },
          ],

          users: [
            {
              $match: {
                userId: { $type: "objectId" },
              },
            },
            {
              $group: { _id: "$userId" },
            },
            {
              $count: "total",
            },
          ],

          sessions: [
            {
              $match: {
                sessionId: {
                  $type: "string",
                  $ne: "",
                },
              },
            },
            {
              $group: { _id: "$sessionId" },
            },
            {
              $count: "total",
            },
          ],
        },
      },
      {
        $set: {
          seriesStart: {
            $dateTrunc: {
              date: rangeStart
                ? { $literal: rangeStart }
                : {
                    $ifNull: [
                      { $arrayElemAt: ["$buckets._id", 0] },
                      { $literal: now },
                    ],
                  },
              unit: bucketUnit,
              timezone: timeZone,
            },
          },

          seriesEnd: {
            $dateTrunc: {
              date: { $literal: now },
              unit: bucketUnit,
              timezone: timeZone,
            },
          },
        },
      },
      {
        $project: {
          _id: 0,

          total: {
            $ifNull: [{ $arrayElemAt: ["$stats.total", 0] }, 0],
          },

          authenticatedEvents: {
            $ifNull: [
              {
                $arrayElemAt: ["$stats.authenticatedEvents", 0],
              },
              0,
            ],
          },

          guestEvents: {
            $subtract: [
              {
                $ifNull: [{ $arrayElemAt: ["$stats.total", 0] }, 0],
              },
              {
                $ifNull: [
                  {
                    $arrayElemAt: ["$stats.authenticatedEvents", 0],
                  },
                  0,
                ],
              },
            ],
          },

          linkedUsers: {
            $ifNull: [{ $arrayElemAt: ["$users.total", 0] }, 0],
          },

          sessions: {
            $ifNull: [{ $arrayElemAt: ["$sessions.total", 0] }, 0],
          },

          series: {
            $map: {
              input: {
                $range: [
                  0,
                  {
                    $toInt: {
                      $add: [
                        {
                          $dateDiff: {
                            startDate: "$seriesStart",
                            endDate: "$seriesEnd",
                            unit: bucketUnit,
                            timezone: timeZone,
                          },
                        },
                        1,
                      ],
                    },
                  },
                ],
              },

              as: "offset",

              in: {
                $let: {
                  vars: {
                    bucketDate: {
                      $dateAdd: {
                        startDate: "$seriesStart",
                        unit: bucketUnit,
                        amount: "$$offset",
                        timezone: timeZone,
                      },
                    },
                  },

                  in: {
                    date: "$$bucketDate",

                    total: {
                      $let: {
                        vars: {
                          matchingBucket: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$buckets",
                                  as: "bucket",
                                  cond: {
                                    $eq: ["$$bucket._id", "$$bucketDate"],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },

                        in: {
                          $ifNull: ["$$matchingBucket.total", 0],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ];

    const results = await Tracker.aggregate<ReportResult>(pipeline).option({
      maxTimeMS: 15_000,
    });

    const report = results[0] || {
      total: 0,
      authenticatedEvents: 0,
      guestEvents: 0,
      linkedUsers: 0,
      sessions: 0,
      series: [],
    };

    const totalPages = Math.max(1, Math.ceil(report.total / PAGE_SIZE));

    const page = Math.min(requestedPage, totalPages);

    const activities = (await Tracker.find(filter)
      .populate({
        path: "userId",
        select: "name email",
        model: User,
      })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean()) as unknown as ActivityRecord[];

    const chartData: ActivityChartPoint[] = report.series.map((point) => ({
      timestamp: new Date(point.date).getTime(),
      total: Number(point.total) || 0,
    }));

    const firstRecord = report.total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;

    const lastRecord = Math.min(page * PAGE_SIZE, report.total);

    const summary = [
      { label: "Recorded events", value: report.total },
      { label: "Linked users", value: report.linkedUsers },
      { label: "Session IDs", value: report.sessions },
      { label: "Guest events", value: report.guestEvents },
    ];

    const thClass =
      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

    const tdClass = "px-4 py-4 text-sm text-slate-700 dark:text-slate-200";

    return (
      <div className="rounded-3xl border border-white/40 bg-white/80 p-4 shadow-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            User Activity Logs
          </h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Recorded events, not guaranteed unique visits or active users. All
            summaries, chart data, and table records use the same filters.
          </p>
        </div>

        <ActivityTrackerControls
          timeZone={timeZone}
          generatedAt={now.toISOString()}
        />

        <div className="mb-5 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildHref(option.value, searchQuery, timeZone)}
              scroll={false}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                option.value === range
                  ? "bg-teal-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <form
          action="/admin/activitytracker"
          method="GET"
          className="mb-6 flex flex-col gap-3 sm:flex-row"
        >
          <input type="hidden" name="range" value={range} />
          <input type="hidden" name="tz" value={timeZone} />

          <label htmlFor="activity-query" className="sr-only">
            Search by user name or email
          </label>

          <input
            key={searchQuery}
            id="activity-query"
            name="q"
            type="search"
            defaultValue={searchQuery}
            maxLength={100}
            placeholder="Search by user name or email..."
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Search
          </button>

          {searchQuery && (
            <Link
              href={buildHref(range, "", timeZone)}
              className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Clear
            </Link>
          )}
        </form>

        {searchQuery && (
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            All results are filtered to users matching “{searchQuery}”.
          </p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.label}
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {new Intl.NumberFormat("en-US").format(item.value)}
              </p>
            </div>
          ))}
        </div>

        <ActivityChart
          data={chartData}
          rangeLabel={rangeLabel}
          timeZone={timeZone}
          bucketUnit={bucketUnit}
        />

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                {[
                  "User",
                  "Action",
                  "Page",
                  "Country",
                  "City",
                  "Duration",
                  "Created",
                  "Updated",
                ].map((heading) => (
                  <th key={heading} className={thClass}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
              {activities.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No activity records match the selected filters.
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr
                    key={activity._id.toString()}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className={tdClass}>
                      <div className="font-medium">
                        {activity.userId?.name ||
                          (activity.isAuthenticated
                            ? "Account unavailable"
                            : "Guest")}
                      </div>

                      {activity.userId?.email && (
                        <div className="mt-1 text-xs text-slate-500">
                          {activity.userId.email}
                        </div>
                      )}
                    </td>

                    <td className={`${tdClass} whitespace-nowrap`}>
                      {activity.actionType || "—"}
                    </td>

                    <td
                      className={`${tdClass} max-w-xs truncate`}
                      title={activity.pathname || ""}
                    >
                      {activity.pathname || "—"}
                    </td>

                    <td className={`${tdClass} whitespace-nowrap`}>
                      {activity.country || activity.countryCode || "Unknown"}
                    </td>

                    <td className={`${tdClass} whitespace-nowrap`}>
                      {activity.city || "Unknown"}
                    </td>

                    <td className={`${tdClass} whitespace-nowrap`}>
                      {formatDuration(activity.duration)}
                    </td>

                    <td className={`${tdClass} whitespace-nowrap`}>
                      {formatTimestamp(activity.createdAt, timeZone)}
                    </td>

                    <td className={`${tdClass} whitespace-nowrap`}>
                      {formatTimestamp(activity.updatedAt, timeZone)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {firstRecord}–{lastRecord} of {report.total} records. Page{" "}
            {page} of {totalPages}.
          </p>

          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildHref(range, searchQuery, timeZone, page - 1)}
                scroll={false}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Previous
              </Link>
            )}

            {page < totalPages && (
              <Link
                href={buildHref(range, searchQuery, timeZone, page + 1)}
                scroll={false}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Next
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          <p>
            Location is approximate and IP-based. VPNs, proxies, and unavailable
            provider data can affect country/city results. Older records may
            have no location.
          </p>

          <p>
            Durations are displayed assuming the tracker sends seconds. Session
            IDs are client-provided identifiers, not verified people.
          </p>

          <p>
            Invalid or future-dated database creation timestamps are excluded
            from this report; existing records are not modified.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to load activity report:", error);

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 dark:border-red-900 dark:bg-red-950/30">
        <h1 className="text-2xl font-bold text-red-700 dark:text-red-300">
          Unable to load activity logs
        </h1>

        <p className="mt-3 text-sm text-red-600 dark:text-red-200">
          The report could not be loaded. Please try again. If it continues,
          check the server logs.
        </p>

        <Link
          href={buildHref(range, searchQuery, timeZone)}
          className="mt-5 inline-flex rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </Link>
      </div>
    );
  }
}
