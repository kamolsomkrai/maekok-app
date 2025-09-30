import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeek } from "date-fns";
import type { Prisma } from "@prisma/client";

interface Submission {
  id: string;
  weekNumber: number;
  year: number;
  hospital: {
    id: string;
    name: string;
    province: string;
  };
  icdEntries: {
    code: string;
    count: number;
  }[];
}

export const dynamic = "force-dynamic"; // Prevent static caching

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const province = searchParams.get("province");
  const hospitalIds = searchParams.getAll("hospitalIds");

  const where: Prisma.maekok_summary_aggregatedWhereInput = {};
  where.date_serv = {};
  if (startDate)
    where.date_serv = { ...where.date_serv, gte: new Date(startDate) };
  if (endDate) where.date_serv = { ...where.date_serv, lte: new Date(endDate) };
  if (province) where.provcode = province;
  if (hospitalIds.length > 0) where.hospcode = { in: hospitalIds };

  try {
    const result = await prisma.maekok_summary_aggregated.findMany({
      where,
      orderBy: [{ date_serv: "asc" }, { hospcode: "asc" }],
    });

    const groupedData: { [key: string]: Submission } = {};

    for (const row of result) {
      const year = row.date_serv.getFullYear();
      const weekNumber = getWeek(row.date_serv, { weekStartsOn: 1 });
      const groupKey = `${year}-${weekNumber}-${row.hospcode}`;

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          id: groupKey,
          year,
          weekNumber,
          hospital: {
            id: row.hospcode,
            name: row.hosname || "N/A",
            province: row.provcode || "N/A",
          },
          icdEntries: [],
        };
      }

      if (row.total_count !== null && row.total_count !== undefined) {
        groupedData[groupKey].icdEntries.push({
          code: row.diagcode,
          count: Number(row.total_count),
        });
      }
    }

    const finalData = Object.values(groupedData);
    return NextResponse.json(finalData);
  } catch (error) {
    console.error("API Error fetching report data:", error);
    return NextResponse.json(
      { message: "Failed to fetch report data" },
      { status: 500 }
    );
  }
}
