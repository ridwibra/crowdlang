"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ActivityChartPoint = {
  timestamp: number;
  total: number;
};

interface ActivityChartProps {
  data: ActivityChartPoint[];
  rangeLabel: string;
  timeZone: string;
  bucketUnit: "hour" | "day" | "month";
}

export default function ActivityChart({
  data,
  rangeLabel,
  timeZone,
  bucketUnit,
}: ActivityChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const hasData = data.some((point) => point.total > 0);

  const tickFormatter = new Intl.DateTimeFormat(
    "en-US",
    bucketUnit === "hour"
      ? {
          hour: "numeric",
          timeZone,
        }
      : bucketUnit === "day"
        ? {
            month: "short",
            day: "numeric",
            timeZone,
          }
        : {
            month: "short",
            year: "2-digit",
            timeZone,
          },
  );

  const tooltipFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(bucketUnit === "hour"
      ? {
          hour: "numeric" as const,
          minute: "2-digit" as const,
          timeZoneName: "short" as const,
        }
      : {}),
    timeZone,
  });

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Activity over time
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Recorded events · {rangeLabel} · {timeZone}
        </p>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Empty periods are included. The first and last buckets may cover
          partial periods.
        </p>
      </div>

      <div className="h-72 p-4 sm:h-80 sm:p-6">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 12,
                left: -12,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#cbd5e1"
                vertical={false}
                className="dark:opacity-30"
              />

              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) =>
                  tickFormatter.format(new Date(Number(value)))
                }
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tick={{
                  fill: "#64748b",
                  fontSize: 12,
                }}
              />

              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{
                  fill: "#64748b",
                  fontSize: 12,
                }}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                }}
                formatter={(value) => {
                  const count = Number(value);

                  return [
                    `${count} event${count === 1 ? "" : "s"}`,
                    "Activity",
                  ];
                }}
                labelFormatter={(label) =>
                  tooltipFormatter.format(new Date(Number(label)))
                }
              />

              <Area
                type="stepAfter"
                dataKey="total"
                stroke="#0d9488"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                activeDot={{
                  r: 4,
                  fill: "#0f766e",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            No activity was recorded for these filters.
          </div>
        )}
      </div>
    </section>
  );
}
