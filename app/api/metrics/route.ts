// app/api/metrics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const province = searchParams.get("province");
    const hospitalIds = searchParams.getAll("hospitalIds");

    const where: Prisma.maekok_summary_aggregatedWhereInput = {};
    where.date_serv = {};
    if (startDate)
      where.date_serv = { ...where.date_serv, gte: new Date(startDate) };
    if (endDate)
      where.date_serv = { ...where.date_serv, lte: new Date(endDate) };
    if (province) where.provcode = province;
    if (hospitalIds.length > 0) where.hospcode = { in: hospitalIds };

    const [totalCasesData, hospitalCount, topProvince, topGroup] =
      await prisma.$transaction([
        prisma.maekok_summary_aggregated.aggregate({
          _sum: { total_count: true },
          where: {
            ...where,
            hospcode: { in: ["10674", "11126"] },
          },
        }),
        prisma.maekok_summary_aggregated.findMany({
          where: {
            ...where,
            hospcode: { in: ["10674", "11126"] },
          },
          distinct: ["hospcode"],
        }),
        prisma.maekok_summary_aggregated.groupBy({
          by: ["provname"],
          where: {
            ...where,
            provname: { not: null },
            hospcode: { in: ["10674", "11126"] },
          },
          _sum: { total_count: true },
          orderBy: { _sum: { total_count: "desc" } },
          take: 1,
        }),
        prisma.maekok_summary_aggregated.groupBy({
          by: ["groupname"],
          where: {
            ...where,
            groupname: { not: null },
            hospcode: { in: ["10674", "11126"] },
          },
          _sum: { total_count: true },
          orderBy: { _sum: { total_count: "desc" } },
          take: 1,
        }),
      ]);

    const metrics = {
      totalCases: Number(totalCasesData._sum.total_count) || 0,
      hospitalCount: hospitalCount.length || 0,
      topProvince: topProvince[0]?.provname || "N/A",
      topGroup: topGroup[0]?.groupname || "N/A",
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("API Error fetching metrics:", error);
    return NextResponse.json(
      { message: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
