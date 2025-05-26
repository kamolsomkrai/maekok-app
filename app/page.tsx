'use client'

import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
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
import { CalendarIcon, Search, Filter, X, Check, ChevronsUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface ICDEntry {
  code: string
  count: number
}

interface Hospital {
  id: string
  name: string
  province: string
}

interface Submission {
  id: string
  weekStart: string
  weekEnd: string
  hospital: Hospital
  icdEntries: ICDEntry[]
}

const codes: Record<string, string[]> = {
  'กลุ่มอาการทางระบบประสาท / การรับความรู้สึกผิดปกติ': ['R20.0', 'R20.2'],
  'กลุ่มอาการทางผิวหนัง': ['L85.9', 'L85.1', 'L66.1', 'L11.0', 'L81.0', 'L81.4', 'L81.9', 'L30.9', 'L81.8', 'L81.2'],
  'กลุ่มอาการทางระบบทางเดินอาหาร': ['R11.1', 'R11.0', 'R11.2', 'K52.9'],
  'กลุ่มโรคต่อมไร้ท่อ / เมตาบอลิซม': ['E27.1'],
}

const provinces = [
  { id: '50', name: 'เชียงใหม่' },
  { id: '57', name: 'เชียงราย' }
]

function formatDate(d: string) {
  return format(new Date(d), 'dd/MM/yyyy', { locale: th })
}

export default function ReportPage() {
  const [data, setData] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [selectedProvince, setSelectedProvince] = useState('')
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [searchHosp, setSearchHosp] = useState('')
  const [selectedHosps, setSelectedHosps] = useState<Hospital[]>([])
  const [openHospitalPopover, setOpenHospitalPopover] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get<Submission[]>('/api/submissions', {
        params: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          province: selectedProvince,
          hospitalIds: selectedHosps.map(h => h.id),
        }
      })
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedProvince, selectedHosps])

  useEffect(() => {
    let mounted = true
    const loadHospitals = async () => {
      try {
        const res = await axios.get<Hospital[]>('/api/hospitals')
        if (mounted) setHospitals(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    loadHospitals()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const groups = Object.keys(codes)
  const filteredHosp = hospitals.filter(h =>
    `${h.name} ${h.id} ${h.province}`
      .toLowerCase()
      .includes(searchHosp.toLowerCase())
  )

  const clearFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setSelectedProvince('')
    setSelectedHosps([])
    setSearchHosp('')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="justify-center items-center flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-blue-900">รายงานสรุปข้อมูลการเฝ้าระวังทางระบาดวิทยา</h1>
        <h1 className="text-3xl font-bold text-blue-900">กรณีการปนเปื้อนสารหนู พื้นที่จังหวัดเชียงใหม่ และเชียงราย</h1>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-cyan-50 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                <span>ตัวกรองข้อมูล</span>
              </CardTitle>
              <CardDescription className="text-blue-200">
                กรองข้อมูลตามช่วงเวลาและสถานที่ที่ต้องการ
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              onClick={clearFilters}
              disabled={loading}
              className="text-cyan-50 hover:bg-blue-700"
            >
              <X className="w-4 h-4 mr-2" />
              ล้างตัวกรอง
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-blue-900 font-medium">ช่วงเวลาเริ่มต้น</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-blue-300 hover:bg-blue-50 text-blue-900"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP', { locale: th }) : <span>เลือกวันที่</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-blue-200 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    locale={th}
                    className="border-0"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-blue-900 font-medium">ช่วงเวลาสิ้นสุด</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-blue-300 hover:bg-blue-50 text-blue-900"
                    disabled={!startDate}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP', { locale: th }) : <span>เลือกวันที่</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-blue-200 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    locale={th}
                    fromDate={startDate}
                    className="border-0"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="province" className="text-blue-900 font-medium">จังหวัด</Label>
              <Select
                value={selectedProvince || "all"}
                onValueChange={(value) => setSelectedProvince(value === "all" ? "" : value)}
              >
                <SelectTrigger className="border-blue-300 hover:bg-blue-50 text-blue-900">
                  <SelectValue placeholder="เลือกจังหวัด..." />
                </SelectTrigger>
                <SelectContent className="border-blue-200 shadow-lg">
                  <SelectItem value="all" className="hover:bg-blue-50">ทั้งหมด</SelectItem>
                  {provinces.map(prov => (
                    <SelectItem
                      key={prov.id}
                      value={prov.id}
                      className="hover:bg-blue-50"
                    >
                      {prov.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hospital-search" className="text-blue-900 font-medium">ค้นหาโรงพยาบาล</Label>
              <Popover open={openHospitalPopover} onOpenChange={setOpenHospitalPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openHospitalPopover}
                    className="w-full justify-between border-blue-300 hover:bg-blue-50 text-blue-900"
                  >
                    {searchHosp || "พิมพ์ชื่อ, รหัส หรือจังหวัด..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 border-blue-200 shadow-lg">
                  <Command>
                    <CommandInput
                      placeholder="ค้นหาโรงพยาบาล..."
                      value={searchHosp}
                      onValueChange={setSearchHosp}
                      className="border-blue-100 focus:ring-2 focus:ring-cyan-500"
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty className="text-blue-800 py-4 text-center">
                        ไม่พบโรงพยาบาลที่ตรงกับคำค้นหา
                      </CommandEmpty>
                      <CommandGroup className="bg-white">
                        {filteredHosp.map(h => (
                          <CommandItem
                            key={h.id}
                            value={`${h.id} ${h.name} ${h.province}`}
                            onSelect={() => {
                              setSelectedHosps(prev =>
                                prev.some(sh => sh.id === h.id)
                                  ? prev.filter(x => x.id !== h.id)
                                  : [...prev, h]
                              )
                            }}
                            className="aria-selected:bg-blue-50 hover:bg-blue-50 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className={`w-4 h-4 flex items-center justify-center rounded border mr-2 ${selectedHosps.some(sh => sh.id === h.id)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-blue-300'
                                }`}>
                                {selectedHosps.some(sh => sh.id === h.id) && (
                                  <Check className="w-3 h-3" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-blue-900 truncate">{h.name}</div>
                                <div className="flex justify-between text-xs text-blue-600">
                                  <span>รหัส: {h.id}</span>
                                  {provinces.map(prov => prov.id === h.province).length > 0 && (
                                    <span>จังหวัด: {provinces.find(prov => prov.id === h.province)?.name}</span>
                                  )}
                                  {/* <span>จังหวัด: {h.province}</span> */}
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {selectedHosps.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedHosps.map(hosp => (
                <Badge
                  key={hosp.id}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 border-blue-200"
                >
                  <span className="truncate max-w-xs">{hosp.name}</span>
                  <button
                    onClick={() => setSelectedHosps(prev => prev.filter(h => h.id !== hosp.id))}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-t-lg">
          <div className="space-y-1">
            <CardTitle className="text-cyan-50">ผลลัพธ์การค้นหา</CardTitle>
            <CardDescription className="text-blue-200">
              {data.length > 0 ? (
                `พบข้อมูลทั้งหมด ${data.length} รายการ`
              ) : (
                'ไม่มีข้อมูลที่ตรงกับเงื่อนไขการค้นหา'
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md bg-blue-100" />
              ))}
            </div>
          ) : data.length > 0 ? (
            <div className="rounded-md border border-blue-200 overflow-hidden">
              <Table className="bg-white">
                <TableHeader className="bg-blue-100/50">
                  <TableRow>
                    <TableHead className="w-[180px] text-blue-900 font-medium">สัปดาห์</TableHead>
                    <TableHead className="min-w-[200px] text-blue-900 font-medium">โรงพยาบาล</TableHead>
                    {Object.entries(codes).map(([group, list]) => (
                      <TableHead key={group} className="whitespace-normal text-center text-blue-900 font-medium">
                        <div className="flex flex-col items-center">
                          <span>{group}</span>
                          <span className="text-xs text-blue-600 mt-1">
                            ({list.join(', ')})
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map(sub => {
                    const sums = groups.map(g =>
                      sub.icdEntries
                        .filter(e => codes[g].includes(e.code))
                        .reduce((a, b) => a + b.count, 0)
                    )
                    const label = `${formatDate(sub.weekStart)} – ${formatDate(sub.weekEnd)}`
                    return (
                      <TableRow key={sub.id} className="hover:bg-blue-50/50">
                        <TableCell className="font-medium text-blue-900">{label}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-blue-900">{sub.hospital.name}</div>
                            {provinces.map((prov) => (
                              prov.id === sub.hospital.province && (
                                <div key={prov.id} className="text-xs text-blue-600">
                                  {prov.name}
                                </div>
                              )
                            ))}

                          </div>
                        </TableCell>
                        {sums.map((n, i) => (
                          <TableCell key={i} className="text-center">
                            {n > 0 ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                                {n}
                              </Badge>
                            ) : (
                              <span className="text-blue-400">0</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
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