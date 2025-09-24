// app/page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import dynamic from 'next/dynamic'
import {
  Card, CardHeader, CardContent, CardTitle, CardDescription
} from '@/components/ui/card'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
import {
  Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList
} from '@/components/ui/command'
import {
  Popover, PopoverTrigger, PopoverContent
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  CalendarIcon, Search, Filter, X, Check, ChevronsUpDown, Download,
  BarChart, Users, Hospital, Activity, MapPin, Building, ListChecks
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import Papa from 'papaparse'
import type { FilterData } from '@/app/api/filters/route'

const TrendsChart = dynamic(() => import('@/components/TrendsChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />
});

// --- TYPE DEFINITIONS ---
interface Hospital { id: string; name: string; province: string; }
interface Province { id: string; name: string; }
interface RawDataEntry {
  hospcode: string;
  hosname: string | null;
  provcode: string | null;
  provname: string | null;
  dist_name_th: string | null;
  date_serv: string;
  diagcode: string;
  groupname: string | null;
  total_count: string;
}
interface Metrics {
  totalCases: number;
  hospitalCount: number;
  topProvince: string;
  topGroup: string;
}
interface TrendData {
  date: string;
  "จำนวนผู้ป่วย": number;
}
interface Top5Data {
  name: string;
  count: number;
}
interface Top5Response {
  topProvinces: Top5Data[];
  topHospitals: Top5Data[];
  topGroups: Top5Data[];
}

// --- REFACTORED UI COMPONENTS ---

const DashboardHeader = () => (
  <div className="text-center mb-8">
    {/* <h1 className="text-4xl font-bold text-blue-900 tracking-tight">Dashboard เฝ้าระวังการเจ็บป่วย</h1>
    <p className="text-lg text-blue-700 mt-2">ที่อาจเกี่ยวข้องกับการสัมผัสสารหนู เขตสุขภาพที่ 1</p> */}
  </div>
);

const MetricCard = ({ title, value, icon, loading }: { title: string, value: string | number, icon: React.ReactNode, loading: boolean }) => (
  <Card className="shadow-md border-blue-100 transition-transform hover:scale-105">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-blue-800">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-blue-900">{typeof value === 'number' ? value.toLocaleString() : value}</div>}
    </CardContent>
  </Card>
);

const Top5List = ({ title, data, icon, loading }: { title: string, data: Top5Data[], icon: React.ReactNode, loading: boolean }) => (
  <Card className="shadow-md border-blue-100 h-full">
    <CardHeader>
      <CardTitle className="text-md font-semibold text-blue-900 flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      ) : (
        <ul className="space-y-2">
          {data.length > 0 ? data.map((item, index) => (
            <li key={index} className="flex justify-between items-center text-sm">
              <span className="text-blue-800 truncate pr-2">{item.name}</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex-shrink-0">{item.count.toLocaleString()}</Badge>
            </li>
          )) : <p className='text-sm text-gray-500'>ไม่มีข้อมูล</p>}
        </ul>
      )}
    </CardContent>
  </Card>
);

// --- MAIN PAGE COMPONENT ---
export default function ReportPage() {
  // State management
  const [rawData, setRawData] = useState<RawDataEntry[]>([]);
  const [loading, setLoading] = useState({ table: true, dashboard: true });
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedProvince, setSelectedProvince] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedHosps, setSelectedHosps] = useState<Hospital[]>([]);
  const [openHospitalPopover, setOpenHospitalPopover] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // Dashboard state
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [top5Data, setTop5Data] = useState<Top5Response>({ topProvinces: [], topHospitals: [], topGroups: [] });
  const [trendsView, setTrendsView] = useState<'daily' | 'weekly'>('daily');

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
    if (selectedProvince) params.append('province', selectedProvince);
    selectedHosps.forEach(h => params.append('hospitalIds', h.id));
    return params;
  }, [startDate, endDate, selectedProvince, selectedHosps]);

  const fetchData = useCallback(async (page: number, params: URLSearchParams) => {
    setLoading(prev => ({ ...prev, table: true }));
    try {
      const newParams = new URLSearchParams(params);
      newParams.append('page', page.toString());
      newParams.append('limit', itemsPerPage.toString());
      const res = await axios.get<{ data: RawDataEntry[], totalCount: number }>(`/api/raw-data?${newParams.toString()}`);
      setRawData(res.data.data);
      setTotalCount(res.data.totalCount);
    } catch (err) {
      console.error("Failed to fetch raw data:", err);
    } finally {
      setLoading(prev => ({ ...prev, table: false }));
    }
  }, [itemsPerPage]);

  const fetchDashboardData = useCallback(async (params: URLSearchParams) => {
    setLoading(prev => ({ ...prev, dashboard: true }));
    try {
      const trendParams = new URLSearchParams(params);
      trendParams.append('view', trendsView);
      const [metricsRes, trendsRes, top5Res] = await Promise.all([
        axios.get<Metrics>(`/api/metrics?${params.toString()}`),
        axios.get<TrendData[]>(`/api/trends?${trendParams.toString()}`),
        axios.get<Top5Response>(`/api/top5?${params.toString()}`),
      ]);
      setMetrics(metricsRes.data);
      setTrendsData(trendsRes.data);
      setTop5Data(top5Res.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  }, [trendsView]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await axios.get<FilterData>('/api/filters');
        setHospitals(res.data.hospitals);
        setProvinces(res.data.provinces);
      } catch (err) {
        console.error("Failed to load filter data:", err);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    const params = buildParams();
    setCurrentPage(1);
    fetchData(1, params);
    fetchDashboardData(params);
  }, [buildParams, fetchData, fetchDashboardData]);

  useEffect(() => {
    if (currentPage > 1) {
      const params = buildParams();
      fetchData(currentPage, params);
    }
  }, [currentPage]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
      if (selectedProvince) params.append('province', selectedProvince);
      selectedHosps.forEach(h => params.append('hospitalIds', h.id));
      params.append('export', 'true');

      const res = await axios.get<{ data: RawDataEntry[] }>(`/api/raw-data?${params.toString()}`);

      // [UPDATED] Export columns to match final schema
      const csv = Papa.unparse(res.data.data, {
        header: true,
        columns: ["date_serv", "hospcode", "hosname", "provname", "dist_name_th", "diagcode", "groupname", "total_count"]
      });

      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `maekok-raw-data_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export data:", err);
    }
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedProvince('');
    setSelectedHosps([]);
  };

  return (
    <main className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <DashboardHeader />

        {/* Section: Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="ผู้ป่วยสะสมทั้งหมด" value={metrics?.totalCases ?? 0} icon={<Users className="h-5 w-5 text-blue-500" />} loading={loading.dashboard} />
          <MetricCard title="จำนวน รพ. ที่รายงาน" value={metrics?.hospitalCount ?? 0} icon={<Hospital className="h-5 w-5 text-blue-500" />} loading={loading.dashboard} />
          <MetricCard title="จังหวัดที่พบสูงสุด" value={metrics?.topProvince ?? 'N/A'} icon={<BarChart className="h-5 w-5 text-blue-500" />} loading={loading.dashboard} />
          <MetricCard title="กลุ่มอาการที่พบสูงสุด" value={metrics?.topGroup ?? 'N/A'} icon={<Activity className="h-5 w-5 text-blue-500" />} loading={loading.dashboard} />
        </div>

        {/* Section: Filters */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-cyan-50 flex items-center gap-2"><Filter className="w-5 h-5" /><span>ตัวกรองข้อมูล</span></CardTitle>
                <CardDescription className="text-blue-200">กรองข้อมูลตามช่วงเวลาและสถานที่ที่ต้องการ</CardDescription>
              </div>
              <Button variant="destructive" onClick={clearFilters} disabled={loading.table}>
                <X className="w-4 h-4 mr-2" /> ล้างตัวกรอง
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Filter inputs grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-blue-900 font-medium">ช่วงเวลาเริ่มต้น</Label>
                <Popover><PopoverTrigger asChild><Button id="start-date" variant="outline" className="w-full justify-start text-left font-normal border-blue-300 hover:bg-blue-50 text-blue-900"><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, 'PPP', { locale: th }) : <span>เลือกวันที่</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 border-blue-200 shadow-lg"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={th} className="border-0" /></PopoverContent></Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-blue-900 font-medium">ช่วงเวลาสิ้นสุด</Label>
                <Popover><PopoverTrigger asChild><Button id="end-date" variant="outline" className="w-full justify-start text-left font-normal border-blue-300 hover:bg-blue-50 text-blue-900" disabled={!startDate}><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, 'PPP', { locale: th }) : <span>เลือกวันที่</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 border-blue-200 shadow-lg"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={th} fromDate={startDate} className="border-0" /></PopoverContent></Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="province" className="text-blue-900 font-medium">จังหวัด</Label>
                <Select value={selectedProvince || "all"} onValueChange={(value) => setSelectedProvince(value === "all" ? "" : value)} disabled={provinces.length === 0}>
                  <SelectTrigger className="border-blue-300 hover:bg-blue-50 text-blue-900"><SelectValue placeholder="เลือกจังหวัด..." /></SelectTrigger>
                  <SelectContent className="border-blue-200 shadow-lg">
                    <SelectItem value="all" className="hover:bg-blue-50">ทั้งหมด</SelectItem>
                    {provinces.map(prov => (<SelectItem key={prov.id} value={prov.id} className="hover:bg-blue-50">{prov.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospital-search" className="text-blue-900 font-medium">ค้นหาโรงพยาบาล</Label>
                <Popover open={openHospitalPopover} onOpenChange={setOpenHospitalPopover}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={openHospitalPopover} className="w-full justify-between border-blue-300 hover:bg-blue-50 text-blue-900" disabled={hospitals.length === 0}>{"เลือกโรงพยาบาล..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0 border-blue-200 shadow-lg"><Command><CommandInput placeholder="ค้นหาโรงพยาบาล..." className="border-blue-100 focus:ring-2 focus:ring-cyan-500" /><CommandList className="max-h-[300px] overflow-y-auto"><CommandEmpty className="text-blue-800 py-4 text-center">ไม่พบโรงพยาบาล</CommandEmpty><CommandGroup className="bg-white">{hospitals.map(h => (<CommandItem key={h.id} value={`${h.id} ${h.name}`} onSelect={() => { setSelectedHosps(prev => prev.some(sh => sh.id === h.id) ? prev.filter(x => x.id !== h.id) : [...prev, h]) }} className="aria-selected:bg-blue-50 hover:bg-blue-50 cursor-pointer"><div className="flex items-center gap-2 w-full"><div className={`w-4 h-4 flex items-center justify-center rounded border mr-2 ${selectedHosps.some(sh => sh.id === h.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-blue-300'}`}>{selectedHosps.some(sh => sh.id === h.id) && (<Check className="w-3 h-3" />)}</div><div className="flex-1 min-w-0"><div className="font-medium text-blue-900 truncate">{h.name}</div><div className="flex justify-between text-xs text-blue-600"><span>รหัส: {h.id}</span></div></div></div></CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
              </div>
            </div>
            {selectedHosps.length > 0 && (<div className="mt-4 flex flex-wrap gap-2">{selectedHosps.map(hosp => (<Badge key={hosp.id} variant="secondary" className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 border-blue-200"><span className="truncate max-w-xs">{hosp.name}</span><button onClick={() => setSelectedHosps(prev => prev.filter(h => h.id !== hosp.id))} className="text-blue-600 hover:text-blue-800"><X className="w-3 h-3" /></button></Badge>))}</div>)}
          </CardContent>
        </Card>

        {/* Section: Trends Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-blue-900">แนวโน้มผู้ป่วยตามช่วงเวลา</CardTitle>
                <CardDescription className="text-blue-700 mt-1">
                  กราฟเส้นแสดงจำนวนผู้ป่วย{trendsView === 'daily' ? 'รายวัน' : 'รายสัปดาห์'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={trendsView === 'daily' ? 'default' : 'outline'} onClick={() => setTrendsView('daily')}>รายวัน</Button>
                <Button size="sm" variant={trendsView === 'weekly' ? 'default' : 'outline'} onClick={() => setTrendsView('weekly')}>รายสัปดาห์</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[400px] pt-4">
            <TrendsChart data={trendsData} loading={loading.dashboard} />
          </CardContent>
        </Card>

        {/* Section: Top 5 Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Top5List title="5 จังหวัดที่พบผู้ป่วยสูงสุด" data={top5Data.topProvinces} icon={<MapPin className="h-5 w-5 text-blue-600" />} loading={loading.dashboard} />
          <Top5List title="5 โรงพยาบาลที่พบผู้ป่วยสูงสุด" data={top5Data.topHospitals} icon={<Building className="h-5 w-5 text-blue-600" />} loading={loading.dashboard} />
          <Top5List title="5 กลุ่มอาการที่พบสูงสุด" data={top5Data.topGroups} icon={<ListChecks className="h-5 w-5 text-blue-600" />} loading={loading.dashboard} />
        </div>

        {/* Section: Data Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle className="text-cyan-50">ตารางข้อมูลรายวัน</CardTitle>
                <CardDescription className="text-blue-200">
                  {!loading.table && `แสดง ${rawData.length} จากทั้งหมด ${totalCount} รายการ`}
                </CardDescription>
              </div>
              <Button onClick={handleExport} disabled={loading.table || rawData.length === 0} className="bg-cyan-500 hover:bg-cyan-600 text-blue-900">
                <Download className="w-4 h-4 mr-2" /> Export to CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading.table ? (
              <div className="space-y-2">{[...Array(10)].map((_, i) => (<Skeleton key={i} className="h-10 w-full rounded-md bg-blue-100" />))}</div>
            ) : rawData.length > 0 ? (
              <>
                <div className="rounded-md border border-blue-200 overflow-x-auto">
                  <Table className="bg-white min-w-full">
                    <TableHeader className="bg-blue-100/50">
                      <TableRow>
                        <TableHead className="text-blue-900 font-medium">วันที่</TableHead>
                        <TableHead className="text-blue-900 font-medium">รหัส รพ.</TableHead>
                        <TableHead className="text-blue-900 font-medium">ชื่อ รพ.</TableHead>
                        <TableHead className="text-blue-900 font-medium">จังหวัด</TableHead>
                        <TableHead className="text-blue-900 font-medium">อำเภอ</TableHead>
                        <TableHead className="text-blue-900 font-medium">รหัสโรค</TableHead>
                        <TableHead className="text-blue-900 font-medium">กลุ่มอาการ</TableHead>
                        <TableHead className="text-blue-900 font-medium text-right">จำนวน</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawData.map((row, index) => (
                        <TableRow key={`${row.hospcode}-${row.date_serv}-${row.diagcode}-${index}`} className="hover:bg-blue-50/50">
                          <TableCell className="whitespace-nowrap">{format(new Date(row.date_serv), 'dd MMM yyyy', { locale: th })}</TableCell>
                          <TableCell>{row.hospcode}</TableCell>
                          <TableCell>{row.hosname}</TableCell>
                          <TableCell>{row.provname}</TableCell>
                          <TableCell>{row.dist_name_th}</TableCell>
                          <TableCell>{row.diagcode}</TableCell>
                          <TableCell>{row.groupname}</TableCell>
                          <TableCell className="text-right">{row.total_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-blue-800">หน้า {currentPage} จาก {totalPages}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1 || loading.table}>Previous</Button>
                    <Button variant="outline" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || loading.table}>Next</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-blue-50/50 rounded-lg">
                <Search className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-lg font-medium text-blue-900">ไม่พบข้อมูล</h3>
                <p className="text-blue-600 mt-2">ลองเปลี่ยนเงื่อนไขการค้นหาของคุณ</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}