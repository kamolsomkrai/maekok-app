'use client'

import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import dynamic from 'next/dynamic'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Search, Filter, X, Check, ChevronsUpDown, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import Papa from 'papaparse';
import type { FilterData } from '@/app/api/filters/route';

// Interfaces
interface Hospital {
  id: string
  name: string
  province: string
}
interface Province {
  id: string;
  name: string;
}
// [UPDATED] Interface to match the final Prisma schema
interface RawDataEntry {
  hospcode: string;
  hosname: string | null;
  provcode: string | null;
  provname: string | null;
  dist_name_th: string | null;
  date_serv: string;
  diagcode: string;
  groupname: string | null; // Changed from groupName
  total_count: string;
}

const ChartCard = dynamic(() => import('@/components/ChartCard'), {
  ssr: false,
  loading: () => (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
      <CardHeader>
        <CardTitle className="text-blue-900">สรุปข้อมูลภาพรวม</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <Skeleton className="h-full w-full rounded-md bg-blue-100" />
      </CardContent>
    </Card>
  )
});

const codes: Record<string, string[]> = {
  'กลุ่มอาการทางระบบประสาท / การรับความรู้สึกผิดปกติ': ['R200', 'R202'],
  'กลุ่มอาการทางผิวหนัง': ['L859', 'L851', 'L661', 'L110', 'L810', 'L814', 'L819', 'L309', 'L818', 'L812'],
  'กลุ่มอาการทางระบบทางเดินอาหาร': ['R111', 'R110', 'R112', 'K529'],
  'โรคต่อมไร้ท่อ / เมตาบอลิซม': ['E271'],
  'โรคมะเร็ง': ['D04', 'C44', 'C679'],
  'โรคไต': ['N17', 'N18'],
  'โรคพิษจากสารหนู': ['T570'],
  'โรคอื่น ๆ ที่เกี่ยวข้อง': ['Z582', 'Y97'],
};


function formatDate(d: string | Date) {
  return format(new Date(d), 'dd MMM yyyy', { locale: th })
}

export default function ReportPage() {
  const [rawData, setRawData] = useState<RawDataEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedProvince, setSelectedProvince] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [searchHosp, setSearchHosp] = useState('');
  const [selectedHosps, setSelectedHosps] = useState<Hospital[]>([]);
  const [openHospitalPopover, setOpenHospitalPopover] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
      if (selectedProvince) params.append('province', selectedProvince);
      selectedHosps.forEach(h => params.append('hospitalIds', h.id));
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const res = await axios.get<{ data: RawDataEntry[], totalCount: number }>(`/api/raw-data?${params.toString()}`);
      setRawData(res.data.data);
      setTotalCount(res.data.totalCount);
    } catch (err) {
      console.error("Failed to fetch raw data:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedProvince, selectedHosps, currentPage]);

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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedProvince, selectedHosps]);

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

  const filteredHosp = hospitals.filter(h =>
    `${h.name} ${h.id}`.toLowerCase().includes(searchHosp.toLowerCase())
  );

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedProvince('');
    setSelectedHosps([]);
    setSearchHosp('');
  };

  return (
    <div className="p-6 mx-auto space-y-6">
      <div className="justify-center items-center flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-blue-900">รายงานข้อมูลเฝ้าระวังการเจ็บป่วย (รายวัน)</h1>
        <h1 className="text-3xl font-bold text-blue-900">ที่อาจเกี่ยวข้องกับการสัมผัสสารหนู เขตสุขภาพที่ 1</h1>
      </div>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-cyan-50 flex items-center gap-2">
                <Filter className="w-5 h-5" /><span>ตัวกรองข้อมูล</span>
              </CardTitle>
              <CardDescription className="text-blue-200">กรองข้อมูลตามช่วงเวลาและสถานที่ที่ต้องการ</CardDescription>
            </div>
            <Button variant="ghost" onClick={clearFilters} disabled={loading} className="text-cyan-50 hover:bg-blue-700">
              <X className="w-4 h-4 mr-2" /> ล้างตัวกรอง
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
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
              <Popover open={openHospitalPopover} onOpenChange={setOpenHospitalPopover}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={openHospitalPopover} className="w-full justify-between border-blue-300 hover:bg-blue-50 text-blue-900" disabled={hospitals.length === 0}>{searchHosp || "พิมพ์ชื่อ, รหัส..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0 border-blue-200 shadow-lg"><Command><CommandInput placeholder="ค้นหาโรงพยาบาล..." value={searchHosp} onValueChange={setSearchHosp} className="border-blue-100 focus:ring-2 focus:ring-cyan-500" /><CommandList className="max-h-[300px] overflow-y-auto"><CommandEmpty className="text-blue-800 py-4 text-center">ไม่พบโรงพยาบาล</CommandEmpty><CommandGroup className="bg-white">{filteredHosp.map(h => (<CommandItem key={h.id} value={`${h.id} ${h.name}`} onSelect={() => { setSelectedHosps(prev => prev.some(sh => sh.id === h.id) ? prev.filter(x => x.id !== h.id) : [...prev, h]) }} className="aria-selected:bg-blue-50 hover:bg-blue-50 cursor-pointer"><div className="flex items-center gap-2 w-full"><div className={`w-4 h-4 flex items-center justify-center rounded border mr-2 ${selectedHosps.some(sh => sh.id === h.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-blue-300'}`}>{selectedHosps.some(sh => sh.id === h.id) && (<Check className="w-3 h-3" />)}</div><div className="flex-1 min-w-0"><div className="font-medium text-blue-900 truncate">{h.name}</div><div className="flex justify-between text-xs text-blue-600"><span>รหัส: {h.id}</span></div></div></div></CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
            </div>
          </div>
          {selectedHosps.length > 0 && (<div className="mt-4 flex flex-wrap gap-2">{selectedHosps.map(hosp => (<Badge key={hosp.id} variant="secondary" className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 border-blue-200"><span className="truncate max-w-xs">{hosp.name}</span><button onClick={() => setSelectedHosps(prev => prev.filter(h => h.id !== hosp.id))} className="text-blue-600 hover:text-blue-800"><X className="w-3 h-3" /></button></Badge>))}</div>)}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-cyan-50">ตารางข้อมูลรายวัน</CardTitle>
              <CardDescription className="text-blue-200">
                {!loading && (
                  `แสดง ${rawData.length} จากทั้งหมด ${totalCount} รายการ`
                )}
              </CardDescription>
            </div>
            <Button onClick={handleExport} disabled={loading || rawData.length === 0} className="bg-cyan-500 hover:bg-cyan-600 text-blue-900">
              <Download className="w-4 h-4 mr-2" /> Export All to CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
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
                        <TableCell className="whitespace-nowrap">{formatDate(row.date_serv)}</TableCell>
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
                <span className="text-sm text-blue-800">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                  </Button>
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
  )
}
