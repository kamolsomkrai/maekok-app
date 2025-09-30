// app/api/top5/route.ts
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
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    if (Object.keys(dateFilter).length > 0) where.date_serv = dateFilter;
    if (province) where.provcode = province;
    if (hospitalIds.length > 0) where.hospcode = { in: hospitalIds };

    const [topProvinces, topHospitals, topGroups] = await prisma.$transaction([
      prisma.maekok_summary_aggregated.groupBy({
        by: ["provname"],
        where: {
          ...where,
          provname: { not: null },
          hospcode: { in: ["10674", "11126"] },
        },
        _sum: { total_count: true },
        orderBy: { _sum: { total_count: "desc" } },
        take: 5,
      }),
      prisma.maekok_summary_aggregated.groupBy({
        by: ["hosname"],
        where: {
          ...where,
          hosname: { not: null },
          hospcode: { in: ["10674", "11126"] },
        },
        _sum: { total_count: true },
        orderBy: { _sum: { total_count: "desc" } },
        take: 5,
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
        take: 5,
      }),
    ]);

    const formattedTopProvinces = topProvinces.map((p) => ({
      name: p.provname,
      count: Number(p._sum?.total_count) || 0,
    }));

    const formattedTopHospitals = topHospitals.map((h) => ({
      name: h.hosname,
      count: Number(h._sum?.total_count) || 0,
    }));
    const formattedTopGroups = topGroups.map((g) => ({
      name: g.groupname,
      count: Number(g._sum?.total_count) || 0,
    }));

    return NextResponse.json({
      topProvinces: formattedTopProvinces,
      topHospitals: formattedTopHospitals,
      topGroups: formattedTopGroups,
    });
  } catch (error) {
    console.error("API Error fetching top 5 data:", error);
    return NextResponse.json(
      { message: "Failed to fetch top 5 data" },
      { status: 500 }
    );
  }
}
