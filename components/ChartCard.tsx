'use client'

import React, { useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Interfaces (Copy from page.tsx to keep this component self-contained)
interface ICDEntry {
  code: string;
  count: number;
}
interface Hospital {
  id: string;
  name: string;
  province: string;
}
interface Submission {
  id: string;
  weekNumber: number;
  year: number;
  hospital: Hospital;
  icdEntries: ICDEntry[];
}

interface ChartCardProps {
  data: Submission[];
  codes: Record<string, string[]>;
  loading: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ data, codes, loading }) => {
  const chartData = useMemo(() => {
    const groups = Object.keys(codes);
    const totals = groups.map(group => ({
      name: group.split(' ')[0].replace('/', ''), // Shorten name for chart label
      total: data.flatMap(sub => sub.icdEntries)
        .filter(e => codes[group].includes(e.code))
        .reduce((acc, curr) => acc + curr.count, 0)
    }));
    return totals;
  }, [data, codes]);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="text-blue-900">สรุปข้อมูลภาพรวม</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <Skeleton className="h-full w-full rounded-md bg-blue-100" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
      <CardHeader>
        <CardTitle className="text-blue-900">สรุปข้อมูลภาพรวม</CardTitle>
        <CardDescription className="text-blue-700">
          กราฟแท่งแสดงจำนวนผู้ป่วยรวมในแต่ละกลุ่มอาการ
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#bae6fd" />
            <XAxis dataKey="name" stroke="#075985" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={60} />
            <YAxis stroke="#075985" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderColor: '#38bdf8',
                borderRadius: '0.5rem',
                color: '#0c4a6e'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="total" fill="#0369a1" name="จำนวนผู้ป่วย" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ChartCard;

