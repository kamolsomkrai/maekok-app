'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

axios.defaults.withCredentials = true;

interface Hospital {
  id: string;
  name: string;
  province: string;
}

interface Submission {
  id: string;
  hospitalId: string;
  weekStart: string;
  weekEnd: string;
  icdEntries: {
    code: string;
    count: number;
  }[];
}

const provinces = [
  { id: '50', name: 'เชียงใหม่' },
  { id: '57', name: 'เชียงราย' }
]

const codes: Record<string, string[]> = {
  'กลุ่มอาการทางระบบประสาท / การรับความรู้สึกผิดปกติ': ['R20.0', 'R20.2'],
  'กลุ่มอาการทางผิวหนัง': ['L85.9', 'L85.1', 'L66.1', 'L11.0', 'L81.0', 'L81.4', 'L81.9', 'L30.9', 'L81.8', 'L81.2'],
  'กลุ่มอาการทางระบบทางเดินอาหาร': ['R11.1', 'R11.0', 'R11.2', 'K52.9'],
  'โรคต่อมไร้ท่อ / เมตาบอลิซม': ['E27.1'],
  'โรคมะเร็ง': ['D04', 'C44', 'C67.9'],
  'โรคไต': ['N17', 'N18'],
  'โรคพิษจากสารหนู': ['T57.0'],
  'โรคอื่น ๆ ที่เกี่ยวข้อง': ['Z58.2', 'Y97'],
};

const mapCodeToDescription: Record<string, string> = {
  'R20.0': 'อาการชา',
  'R20.2': 'อาการชา แปลบ เสียว',
  'L85.9': 'ภาวะผิวหนังหนาตัว ไม่ระบุสาเหตุ',
  'L85.1': 'Keratoderma Palmaris et Plantaris',
  'L66.1': 'Lichen Planopilaris',
  'L11.0': 'Acquired keratosis follicularis',
  'L81.0': 'ฝ้า',
  'L81.4': 'ภาวะผิวคล้ำจากเมลานิน',
  'L81.9': 'ภาวะผิวคล้ำ ไม่ระบุสาเหตุ',
  'L30.9': 'โรคผิวหนังอักเสบ ไม่ระบุสาเหตุ',
  'L81.8': 'ภาวะสร้างเม็ดสีผิดปกติ อื่นๆ',
  'L81.2': 'กระ จุดสีผิวเล็กๆ',
  'R11.1': 'อาเจียน',
  'R11.0': 'คลื่นไส้',
  'R11.2': 'คลื่นไส้ร่วมกับอาเจียน',
  'K52.9': 'ลำไส้อักเสบ ไม่ทราบสาเหตุ',
  'E27.1': 'โรค Addison’s (ต่อมหมวกไตผิดปกติ ผิวคล้ำทั่วตัว)',
  'D04': 'Carcinoma in Situ of Skin',
  'C44': 'Other And Unspecified Malignant Neoplasm of Skin',
  'C67.9': 'มะเร็งกระเพาะปัสสาวะ ไม่ระบุสาเหตุ',
  'N17': 'ภาวะไตวายเฉียบพลัน',
  'N18': 'ภาวะไตวายเรื้อรัง',
  'T57.0': 'พิษจากสารหนู',
  'Z58.2': 'Exposure to Water Pollution',
  'Y97': 'Environmental Pollution Related Condition',
};

export default function SubmitPage() {
  const router = useRouter();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchHospital, setSearchHospital] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedSunday, setSelectedSunday] = useState<Date>();
  const [weekStart, setWeekStart] = useState<string>('');
  const [weekEnd, setWeekEnd] = useState<string>('');
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.values(codes).flat().reduce((acc, code) => ({ ...acc, [code]: 0 }), {})
  );
  const [openHospitalPopover, setOpenHospitalPopover] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!selectedHospital || !weekStart || !weekEnd) return;

    axios
      .get<Submission[]>('/api/submissions', {
        params: { startDate: weekStart, endDate: weekEnd, hospitalId: selectedHospital.id },
      })
      .then(res => {
        if (res.data.length) {
          const sub = res.data[0];
          // สร้าง counts ใหม่ขึ้นมาไม่ต้องอ้างถึง counts เก่าด้านนอก
          const newCounts = Object.fromEntries(
            Object.keys(codes).flatMap(group =>
              codes[group].map(code => {
                const entry = sub.icdEntries.find(e => e.code === code);
                return [code, entry ? entry.count : 0] as const;
              })
            )
          );
          setCounts(newCounts);
        }
        else if (res.data.length === 0) {
          // ถ้าไม่มีข้อมูล ให้รีเซ็ต counts เป็น 0
          setCounts(Object.fromEntries(Object.keys(codes).flatMap(group => codes[group].map(code => [code, 0]))));
        }
      })
      .catch(console.error);
  }, [selectedHospital, weekStart, weekEnd]);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await axios.get<Hospital[]>('/api/hospitals');
        setHospitals(res.data);
      } catch (error) {
        console.error('Failed to fetch hospitals:', error);
      }
    };
    fetchHospitals();
  }, []);

  const filteredHospitals = hospitals.filter(hospital =>
    `${hospital.name} ${hospital.id} ${hospital.province}`
      .toLowerCase()
      .includes(searchHospital.toLowerCase())
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (date.getDay() !== 0) {
      alert('กรุณาเลือกวันอาทิตย์เท่านั้น');
      return;
    }

    setSelectedSunday(date);

    // Set week start (Sunday)
    const weekStartDate = format(date, 'yyyy-MM-dd');
    setWeekStart(weekStartDate);

    // Calculate week end (Saturday)
    const saturday = new Date(date);
    saturday.setDate(date.getDate() + 6);
    const weekEndDate = format(saturday, 'yyyy-MM-dd');
    setWeekEnd(weekEndDate);
  };

  const handleChange = (code: string, value: number) => {
    setCounts(prev => ({ ...prev, [code]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedHospital) {
      alert('กรุณาเลือกโรงพยาบาล');
      return;
    }

    if (!selectedSunday) {
      alert('กรุณาเลือกวันอาทิตย์');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/submissions', {
        hospitalId: selectedHospital.id,
        weekStart,
        weekEnd,
        counts,
      });

      alert('บันทึกเรียบร้อยแล้ว');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-t-lg">
          <div className="space-y-2">
            <CardTitle className="text-cyan-50 text-lg font-bold">
              แบบฟอร์มบันทึกข้อมูลเฝ้าระวังการเจ็บป่วยที่อาจเกี่ยวข้องกับการสัมผัสสารหนู เขตสุขภาพที่ 1
            </CardTitle>
            <CardDescription className="text-blue-200">
              กรุณากรอกข้อมูลตามสัปดาห์ที่ต้องการรายงาน
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-blue-900 font-medium">โรงพยาบาล</Label>
              <Popover open={openHospitalPopover} onOpenChange={setOpenHospitalPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openHospitalPopover}
                    className="w-full justify-between border-blue-300 hover:bg-blue-50 text-blue-900"
                  >
                    {selectedHospital
                      ? `${selectedHospital.name}`
                      : "ค้นหาโรงพยาบาล..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 border-blue-200 shadow-lg">
                  <Command className="rounded-lg">
                    <CommandInput
                      placeholder="ค้นหาด้วยชื่อ, ID หรือจังหวัด..."
                      value={searchHospital}
                      onValueChange={setSearchHospital}
                      className="border-blue-100 focus:ring-2 focus:ring-cyan-500"
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty className="text-blue-800 py-4 text-center">
                        ไม่พบโรงพยาบาลที่ตรงกับคำค้นหา
                      </CommandEmpty>
                      <CommandGroup className="bg-white">
                        {filteredHospitals.map(hospital => (
                          <CommandItem
                            key={hospital.id}
                            value={`${hospital.id} ${hospital.name} ${hospital.province}`}
                            onSelect={() => {
                              setSelectedHospital(hospital);
                              setOpenHospitalPopover(false);
                            }}
                            className="aria-selected:bg-blue-50 hover:bg-blue-50 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Check
                                className={`h-4 w-4 flex-shrink-0 ${selectedHospital?.id === hospital.id
                                  ? "text-blue-600 opacity-100"
                                  : "opacity-0"
                                  }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-blue-900 truncate">{hospital.name}</div>
                                <div className="flex justify-between text-xs text-blue-600">
                                  <span>รหัส: {hospital.id}</span>
                                  {provinces.find(p => p.id === hospital.province)?.name && (
                                    <span>จังหวัด: {provinces.find(p => p.id === hospital.province)?.name}</span>
                                  )}
                                  {!provinces.find(p => p.id === hospital.province)?.name && (
                                    <span>จังหวัด: {hospital.province}</span>
                                  )}
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
              {selectedHospital && (
                <div className="text-sm text-blue-700 mt-1">
                  {selectedHospital.name}  จ.{provinces.find(p => p.id === selectedHospital?.province)?.name}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-blue-900 font-medium">เลือกสัปดาห์</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-blue-300 hover:bg-blue-50 text-blue-900"
                  >
                    {selectedSunday
                      ? format(selectedSunday, 'PPP', { locale: th })
                      : 'เลือกเฉพาะวันอาทิตย์ของสัปดาห์'}
                    <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-blue-200 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={selectedSunday}
                    onSelect={handleDateSelect}
                    disabled={date => date.getDay() !== 0}
                    locale={th}
                    initialFocus
                    className="border-0"
                    fromDate={new Date(2020, 0, 1)}
                    toDate={new Date()}
                  />
                </PopoverContent>
              </Popover>
              {selectedSunday && (
                <div className="text-sm text-blue-700 mt-1">
                  สัปดาห์ที่ {format(selectedSunday, 'II', { locale: th })} ของปี {format(selectedSunday, 'yyyy', { locale: th })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-blue-900 font-medium">วันที่เริ่มต้นสัปดาห์</Label>
              <Input
                value={weekStart ? format(new Date(weekStart), 'PPP', { locale: th }) : ''}
                readOnly
                className="bg-blue-50 border-blue-200 text-blue-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-blue-900 font-medium">วันที่สิ้นสุดสัปดาห์</Label>
              <Input
                value={weekEnd ? format(new Date(weekEnd), 'PPP', { locale: th }) : ''}
                readOnly
                className="bg-blue-50 border-blue-200 text-blue-900"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {Object.entries(codes).map(([group, codeList]) => (
              <Card key={group} className="border border-blue-200 bg-white shadow-sm">
                <CardHeader className="bg-blue-100/50 border-b">
                  <CardTitle className="text-base text-blue-900">{group}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {codeList.map(code => (
                    <div key={code} className="flex items-center justify-between gap-4">
                      <Label htmlFor={code} className="w-64 text-blue-800">
                        {mapCodeToDescription[code] || code} ({code})
                      </Label>
                      <Input
                        id={code}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={counts[code]}
                        onChange={e => {
                          const onlyDigits = e.target.value.replace(/\D/g, '');
                          handleChange(code, onlyDigits === '' ? 0 : Number(onlyDigits));
                        }}
                        onKeyPress={e => {
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        required
                        className="w-24 border-blue-200 focus:ring-2 focus:ring-cyan-500"
                      />
                      <span className='w-20 text-blue-800 text-sm'>คน</span>
                    </div>
                  ))}

                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end">
              <Button
                type="submit"
                size="lg"
                className="min-w-40 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังบันทึก...
                  </>
                ) : (
                  'ส่งข้อมูล'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}