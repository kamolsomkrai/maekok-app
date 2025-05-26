// app/api/submissions/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const province = searchParams.get("province");
  const hospitalId = searchParams.get("hospitalId");
  const hospitalIds = searchParams.getAll("hospitalIds");

  // ตั้งเงื่อนไขค้นหา
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (startDate && endDate) {
    where.weekStart = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }
  if (province) {
    where.hospital = { province };
  }
  if (hospitalId) {
    where.hospitalId = hospitalId;
  }
  if (hospitalIds.length > 0) {
    where.hospitalId = { in: hospitalIds };
  }
  try {
    const submissions = await prisma.weekSubmission.findMany({
      where,
      include: { icdEntries: true, hospital: true },
      orderBy: { weekStart: "desc" },
    });
    return NextResponse.json(submissions);
  } catch (error) {
    console.error("GET /api/submissions error:", error);
    return NextResponse.json({ message: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { hospitalId, weekStart, weekEnd, counts } = body;
  if (!hospitalId || !weekStart || !weekEnd || !counts) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }
  try {
    const submission = await prisma.weekSubmission.create({
      data: {
        hospitalId,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        icdEntries: {
          create: Object.entries(counts).map(([code, count]) => ({
            code,
            count: Number(count),
          })),
        },
      },
      include: { icdEntries: true, hospital: true },
    });
    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("POST /api/submissions error:", error);
    return NextResponse.json({ message: "Database error" }, { status: 500 });
  }
}
