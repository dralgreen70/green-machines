"use client";

import { useEffect, useState } from "react";

export default function SwimmerCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/swimmers/count")
      .then((r) => r.json())
      .then((data) => setCount(data.count))
      .catch(() => setCount(0));
  }, []);

  if (count === null) return null;

  return (
    <div className="text-center py-6">
      <p className="text-lg font-semibold text-green-700">
        Tracking{" "}
        <span className="text-3xl font-extrabold text-green-600">
          {count}
        </span>{" "}
        swimmer{count !== 1 ? "s" : ""} and counting
      </p>
    </div>
  );
}
