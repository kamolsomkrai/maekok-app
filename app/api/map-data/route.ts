// app/api/map-data/route.ts
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

    const provinceData = await prisma.maekok_summary_aggregated.groupBy({
      by: ["provname"],
      where: { ...where, provname: { not: null } },
      _sum: {
        total_count: true,
      },
    });

    const mapData = provinceData.map((p) => ({
      province: p.provname,
      count: Number(p._sum.total_count) || 0,
    }));

    return NextResponse.json(mapData);
  } catch (error) {
    console.error("API Error fetching map data:", error);
    return NextResponse.json(
      { message: "Failed to fetch map data" },
      { status: 500 }
    );
  }
}
