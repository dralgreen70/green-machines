import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const swimmers = await prisma.swimmer.findMany({
      include: {
        _count: {
          select: { times: true },
        },
      },
      orderBy: { firstName: "asc" },
    });
    return NextResponse.json(swimmers);
  } catch (error) {
    console.error("Error fetching swimmers:", error);
    return NextResponse.json(
      { error: "Failed to fetch swimmers" },
      { status: 500 }
    );
  }
}
