// app/api/submissions/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const province = searchParams.get("province");
  const hospitalId = searchParams.get("hospitalId");
  // รับ hospitalIds เป็น array (จาก checkbox) และรองรับ hospitalId เดี่ยว
  let hospitalIds = searchParams.getAll("hospitalIds");
  if (hospitalId && hospitalIds.length === 0) {
    hospitalIds = [hospitalId];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (startDate && endDate) {
    where.weekStart = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  // ถ้ามี hospitalIds ให้กรองด้วย hospitalId
  if (hospitalIds.length > 0) {
    where.hospitalId = { in: hospitalIds };
  }
  // ถ้าไม่มี hospitalIds แต่เลือก province ให้กรองด้วย province
  else if (province) {
    where.hospital = { province };
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
  const { hospitalId, weekStart, weekEnd, counts } = await request.json();
  if (!hospitalId || !weekStart || !weekEnd || !counts) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  try {
    // ถ้ามีแล้วให้ update แทน create
    const exist = await prisma.weekSubmission.findFirst({
      where: {
        hospitalId,
        weekStart: new Date(weekStart),
      },
    });

    if (exist) {
      const updated = await prisma.weekSubmission.update({
        where: { id: exist.id },
        data: {
          weekEnd: new Date(weekEnd),
          icdEntries: {
            deleteMany: {},
            create: Object.entries(counts).map(([code, count]) => ({
              code,
              count: Number(count),
            })),
          },
        },
        include: { icdEntries: true, hospital: true },
      });
      return NextResponse.json({ success: true, submission: updated });
    }

    const created = await prisma.weekSubmission.create({
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
    return NextResponse.json({ success: true, submission: created });
  } catch (error) {
    console.error("POST /api/submissions error:", error);
    return NextResponse.json({ message: "Database error" }, { status: 500 });
  }
}
