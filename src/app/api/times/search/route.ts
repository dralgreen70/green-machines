import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get("name");
    if (!name) {
      return NextResponse.json(
        { error: "Name query parameter is required" },
        { status: 400 }
      );
    }

    const swimmers = await prisma.swimmer.findMany({
      where: {
        OR: [
          { firstName: { contains: name } },
          { lastName: { contains: name } },
        ],
      },
      include: {
        times: {
          orderBy: { date: "desc" },
        },
      },
    });

    return NextResponse.json(swimmers);
  } catch (error) {
    console.error("Error searching times:", error);
    return NextResponse.json(
      { error: "Failed to search times" },
      { status: 500 }
    );
  }
}
