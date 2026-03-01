"use client";

import { useState } from "react";

export default function RequestSwimmer() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [usaSwimmingId, setUsaSwimmingId] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [submittedName, setSubmittedName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/swimmer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          usaSwimmingId: usaSwimmingId.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSubmittedName(`${firstName} ${lastName}`);
      setStatus("success");
      setFirstName("");
      setLastName("");
      setUsaSwimmingId("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-green-100">
      <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <span>🔍</span> Request a Swimmer
      </h3>
      <p className="text-gray-500 text-sm mb-5">
        Know a swimmer? Request them and we&apos;ll add their times to our
        database by next Sunday.
      </p>

      {status === "success" ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold text-lg">
            Got it! {submittedName} will be added to our database by next
            Sunday.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-3 text-sm text-green-600 underline hover:text-green-800"
          >
            Request another swimmer
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First Name *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Last Name *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>
          <input
            type="text"
            placeholder="USA Swimming ID (optional)"
            value={usaSwimmingId}
            onChange={(e) => setUsaSwimmingId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
          {status === "error" && (
            <p className="text-red-500 text-sm">
              Something went wrong. Please try again.
            </p>
          )}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {status === "submitting" ? "Submitting..." : "Request Swimmer"}
          </button>
        </form>
      )}
    </section>
  );
}
