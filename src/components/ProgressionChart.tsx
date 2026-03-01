"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatTime } from "@/lib/utils";

interface SwimTime {
  id: number;
  eventName: string;
  timeInSeconds: number;
  date: string;
  meetName: string;
  course: string;
}

export default function ProgressionChart({
  times,
  eventName,
}: {
  times: SwimTime[];
  eventName: string;
}) {
  if (times.length === 0) return null;

  const sorted = [...times].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const data = sorted.map((t) => ({
    date: new Date(t.date).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
    time: t.timeInSeconds,
    meetName: t.meetName,
    formatted: formatTime(t.timeInSeconds),
  }));

  const allTimes = data.map((d) => d.time);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const padding = (maxTime - minTime) * 0.15 || 2;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-500 mb-3">{eventName}</p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
          />
          <YAxis
            domain={[minTime - padding, maxTime + padding]}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickFormatter={(v: number) => formatTime(v)}
            tickLine={false}
            width={65}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-3 text-sm">
                  <p className="font-bold text-green-700">{d.formatted}</p>
                  <p className="text-gray-500">{d.meetName}</p>
                  <p className="text-gray-400">{d.date}</p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="time"
            stroke="#16a34a"
            strokeWidth={3}
            dot={{ r: 5, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 7, fill: "#15803d" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
