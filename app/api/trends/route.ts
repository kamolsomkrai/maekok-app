// app/api/trends/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { startOfWeek, format } from "date-fns";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const filterhospitalIds = ["10674", "11126"];
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const province = searchParams.get("province");
    const group = searchParams.get("group");
    const hospitalIds = searchParams.getAll("hospitalIds");
    const view = searchParams.get("view") || "daily"; // <-- New parameter: 'daily' or 'weekly'

    const where: Prisma.maekok_summary_aggregatedWhereInput = {};
    where.date_serv = {};
    if (startDate)
      where.date_serv = { ...where.date_serv, gte: new Date(startDate) };
    if (endDate)
      where.date_serv = { ...where.date_serv, lte: new Date(endDate) };
    if (province) where.provcode = province;
    if (group) where.groupname = group;
    if (hospitalIds.length > 0) where.hospcode = { in: hospitalIds };
    const dailyData = await prisma.maekok_summary_aggregated.groupBy({
      by: ["date_serv"],
      where: {
        ...where,
        hospcode: { in: filterhospitalIds },
      },
      _sum: {
        total_count: true,
      },
      orderBy: {
        date_serv: "asc",
      },
    });
    if (view === "weekly") {
      const weeklyTotals: { [key: string]: number } = {};
      dailyData.forEach((item) => {
        const date = item.date_serv;
        const weekStartDate = startOfWeek(date, { weekStartsOn: 1 }); // Monday
        const weekKey = format(weekStartDate, "yyyy-MM-dd");

        if (!weeklyTotals[weekKey]) {
          weeklyTotals[weekKey] = 0;
        }
        weeklyTotals[weekKey] += Number(item._sum.total_count) || 0;
      });
      const formattedData = Object.keys(weeklyTotals).map((weekKey) => ({
        date: weekKey,
        จำนวนผู้ป่วย: weeklyTotals[weekKey],
      }));
      return NextResponse.json(formattedData);
    }

    // Default to daily view
    const formattedData = dailyData.map((item) => ({
      date: item.date_serv.toISOString().split("T")[0],
      จำนวนผู้ป่วย: Number(item._sum.total_count) || 0,
    }));
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("API Error fetching trends data:", error);
    return NextResponse.json(
      { message: "Failed to fetch trends data" },
      { status: 500 }
    );
  }
}
