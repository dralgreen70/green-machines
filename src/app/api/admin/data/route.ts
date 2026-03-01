import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  if (token !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [swimmers, requests, lastTime] = await Promise.all([
      prisma.swimmer.findMany({
        include: { _count: { select: { times: true } } },
        orderBy: { firstName: "asc" },
      }),
      prisma.swimmerRequest.findMany({
        orderBy: { requestedAt: "desc" },
      }),
      prisma.swimTime.findFirst({
        orderBy: { date: "desc" },
        select: { date: true },
      }),
    ]);

    const pending = requests.filter((r) => r.status === "pending");
    const synced = requests.filter((r) => r.status === "synced");
    const failed = requests.filter((r) => r.status === "failed");

    return NextResponse.json({
      swimmers,
      requests: { pending, synced, failed },
      lastSyncDate: lastTime?.date || null,
    });
  } catch (error) {
    console.error("Admin data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}
