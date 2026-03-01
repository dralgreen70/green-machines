import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.swimmer.count();
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error counting swimmers:", error);
    return NextResponse.json({ error: "Failed to count" }, { status: 500 });
  }
}
