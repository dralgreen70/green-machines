"use client";

import { useEffect, useState } from "react";
import { formatTime } from "@/lib/utils";
import ProgressionChart from "./ProgressionChart";

interface SwimTime {
  id: number;
  eventName: string;
  timeInSeconds: number;
  date: string;
  meetName: string;
  course: string;
}

interface PersonalBest {
  eventName: string;
  timeInSeconds: number;
  date: string;
  meetName: string;
}

export default function TimesDisplay({
  swimmerId,
  swimmerName,
}: {
  swimmerId: number;
  swimmerName: string;
}) {
  const [times, setTimes] = useState<SwimTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>("");

  useEffect(() => {
    fetch(`/api/swimmers/${swimmerId}/times`)
      .then((r) => r.json())
      .then((data) => {
        setTimes(data);
        const events = [...new Set(data.map((t: SwimTime) => t.eventName))];
        if (events.length > 0) setSelectedEvent(events[0] as string);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [swimmerId]);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl h-48 flex items-center justify-center text-gray-400">
        Loading times...
      </div>
    );
  }

  if (times.length === 0) {
    return (
      <p className="text-gray-400 text-center py-8">No times recorded yet.</p>
    );
  }

  // Calculate personal bests
  const eventMap = new Map<string, SwimTime[]>();
  for (const t of times) {
    if (!eventMap.has(t.eventName)) eventMap.set(t.eventName, []);
    eventMap.get(t.eventName)!.push(t);
  }

  const personalBests: PersonalBest[] = [];
  for (const [eventName, eventTimes] of eventMap) {
    const best = eventTimes.reduce((min, t) =>
      t.timeInSeconds < min.timeInSeconds ? t : min
    );
    personalBests.push({
      eventName,
      timeInSeconds: best.timeInSeconds,
      date: best.date,
      meetName: best.meetName,
    });
  }
  personalBests.sort((a, b) => a.eventName.localeCompare(b.eventName));

  const events = [...eventMap.keys()].sort();

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <span className="text-green-500">⚡</span>
        {swimmerName}&apos;s Personal Bests
      </h3>

      {/* Best times table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-green-50 text-green-800">
              <th className="text-left px-4 py-2 rounded-tl-lg font-semibold">
                Event
              </th>
              <th className="text-right px-4 py-2 font-semibold">Best Time</th>
              <th className="text-right px-4 py-2 font-semibold hidden sm:table-cell">
                Meet
              </th>
              <th className="text-right px-4 py-2 rounded-tr-lg font-semibold hidden sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {personalBests.map((pb, i) => (
              <tr
                key={pb.eventName}
                className={`border-b border-gray-100 ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {pb.eventName}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-green-700">
                  {formatTime(pb.timeInSeconds)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">
                  {pb.meetName}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">
                  {new Date(pb.date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progression section */}
      <div className="mt-6">
        <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-blue-500">📈</span>
          Progression
        </h4>
        <div className="flex flex-wrap gap-2 mb-4">
          {events.map((event) => (
            <button
              key={event}
              onClick={() => setSelectedEvent(event)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedEvent === event
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {event}
            </button>
          ))}
        </div>
        {selectedEvent && (
          <ProgressionChart
            times={eventMap.get(selectedEvent) || []}
            eventName={selectedEvent}
          />
        )}
      </div>
    </div>
  );
}
