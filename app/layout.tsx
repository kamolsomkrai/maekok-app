import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/navbar'
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบบันทึกข้อมูลเฝ้าระวังการเจ็บป่วยที่อาจเกี่ยวข้องกับการสัมผัสสารหนู เขตสุขภาพที่ 1",
  keywords: [
    "ระบบบันทึกข้อมูล",
    "เฝ้าระวังการเจ็บป่วย",
    "สารหนู",
    "เขตสุขภาพที่ 1",
    "สุขภาพ",
    "ข้อมูลสุขภาพ",
    "การบันทึกข้อมูล",
    "การเฝ้าระวัง",
    "การเจ็บป่วย",
    "ระบบสุขภาพ",
    "การจัดการสุขภาพ",
    "การดูแลสุขภาพ",
    "การวิเคราะห์ข้อมูลสุขภาพ",
    "การวิจัยสุขภาพ",
    "การป้องกันโรค",
    "การส่งเสริมสุขภาพ",
    "การดูแลผู้ป่วย",
    "การจัดการข้อมูลสุขภาพ",
    "การพัฒนาระบบสุขภาพ",
    "การสนับสนุนสุขภาพ",
  ],
  authors: [
    {
      name: "ทีมพัฒนาระบบ",
    }],
  description: "ระบบบันทึกข้อมูลเฝ้าระวังการเจ็บป่วยที่อาจเกี่ยวข้องกับการสัมผัสสารหนู เขตสุขภาพที่ 1"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
