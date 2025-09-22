import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface FilterData {
  hospitals: { id: string; name: string; province: string }[];
  provinces: { id: string; name: string }[];
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. ดึงข้อมูลโรงพยาบาลทั้งหมดที่ไม่ซ้ำกัน
    const hospitalData = await prisma.maekok_summary_aggregated.findMany({
      select: {
        hospcode: true,
        hosname: true,
        provcode: true,
      },
      distinct: ["hospcode", "hosname", "provcode"],
      orderBy: {
        hosname: "asc",
      },
    });

    const hospitals = hospitalData.map((h) => ({
      id: h.hospcode,
      name: h.hosname || "N/A",
      province: h.provcode || "N/A",
    }));

    // 2. ดึงข้อมูลจังหวัดทั้งหมดที่ไม่ซ้ำกัน
    const provinceData = await prisma.maekok_summary_aggregated.findMany({
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
    });

    // Prisma's findMany with distinct returns all rows if not all distinct fields are unique.
    // We need to manually create a unique list.
    const provinceMap = new Map<string, string>();
    provinceData.forEach((p) => {
      if (p.provcode && p.provname) {
        provinceMap.set(p.provcode, p.provname);
      }
    });

    const provinces = Array.from(provinceMap, ([id, name]) => ({ id, name }));

    const responseData: FilterData = { hospitals, provinces };

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
