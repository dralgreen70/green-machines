import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const swimmerId = parseInt(id);
    if (isNaN(swimmerId)) {
      return NextResponse.json({ error: "Invalid swimmer ID" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const event = searchParams.get("event");
    const course = searchParams.get("course");

    const where: Record<string, unknown> = { swimmerId };
    if (event) where.eventName = event;
    if (course) where.course = course;

    const times = await prisma.swimTime.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        swimmer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(times);
  } catch (error) {
    console.error("Error fetching times:", error);
    return NextResponse.json(
      { error: "Failed to fetch times" },
      { status: 500 }
    );
  }
}
