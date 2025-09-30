import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface FilterData {
  hospitals: { id: string; name: string; province: string }[];
  provinces: { id: string; name: string }[];
  groups: { name: string }[];
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [hospitalData, provinceData, groupData] = await prisma.$transaction([
      prisma.maekok_summary_aggregated.findMany({
        select: {
          hospcode: true,
          hosname: true,
          provcode: true,
        },
        distinct: ["hospcode", "hosname", "provcode"],
        orderBy: {
          hosname: "asc",
        },
      }),
      prisma.maekok_summary_aggregated.findMany({
        where: {
          provcode: { not: null },
          provname: { not: null },
        },
        select: {
          provcode: true,
          provname: true,
        },
        distinct: ["provcode", "provname"],
        orderBy: {
          provname: "asc",
        },
      }),
      prisma.maekok_summary_aggregated.findMany({
        where: { groupname: { not: null } },
        select: { groupname: true },
        distinct: ["groupname"],
        orderBy: { groupname: "asc" },
      }),
    ]);

    const hospitals = hospitalData.map((h) => ({
      id: h.hospcode,
      name: h.hosname || "N/A",
      province: h.provcode || "N/A",
    }));

    const provinceMap = new Map<string, string>();
    provinceData.forEach((p) => {
      if (p.provcode && p.provname) {
        provinceMap.set(p.provcode, p.provname);
      }
    });
    const provinces = Array.from(provinceMap, ([id, name]) => ({ id, name }));

    const groups = groupData.map((g) => ({ name: g.groupname! }));

    const responseData: FilterData = { hospitals, provinces, groups };
    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof Error) {
      console.error("API Error fetching filters:", error.message);
      return NextResponse.json(
        { message: `Failed to fetch filters: ${error.message}` },
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
