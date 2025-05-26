// app/api/hospitals/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(hospitals);
  } catch (error) {
    console.error("GET /api/hospitals error:", error);
    return NextResponse.error();
  }
}
