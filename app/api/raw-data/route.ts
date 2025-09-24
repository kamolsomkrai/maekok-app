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

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const exportAll = searchParams.get("export") === "true";

    const where: Prisma.maekok_summary_aggregatedWhereInput = {};
    if (startDate)
      where.date_serv = { ...where.date_serv, gte: new Date(startDate) };
    if (endDate)
      where.date_serv = { ...where.date_serv, lte: new Date(endDate) };
    if (province) where.provcode = province;
    if (hospitalIds.length > 0) where.hospcode = { in: hospitalIds };

    const [data, totalCount] = await prisma.$transaction([
      prisma.maekok_summary_aggregated.findMany({
        where: {
          ...where,
          hospcode: { in: ["10674", "11126"] },
        },
        orderBy: { date_serv: "desc" },
        ...(!exportAll && {
          skip: skip,
          take: limit,
        }),
      }),
      prisma.maekok_summary_aggregated.count({ where }),
    ]);

    const serializedData = data.map((row) => ({
      ...row,
      total_count: row.total_count?.toString() || "0",
    }));

    return NextResponse.json({
      data: serializedData,
      totalCount,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("API Error fetching raw data:", error.message);
      return NextResponse.json(
        { message: `Failed to fetch raw data: ${error.message}` },
        { status: 500 }
      );
    }
    console.error("An unknown API error occurred:", error);
    return NextResponse.json(
      { message: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
