import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, usaSwimmingId } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const swimmerRequest = await prisma.swimmerRequest.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        usaSwimmingId: usaSwimmingId?.trim() || null,
        status: "pending",
      },
    });

    return NextResponse.json(swimmerRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating swimmer request:", error);
    return NextResponse.json(
      { error: "Failed to create swimmer request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const requests = await prisma.swimmerRequest.findMany({
      orderBy: { requestedAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching swimmer requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch swimmer requests" },
      { status: 500 }
    );
  }
}
