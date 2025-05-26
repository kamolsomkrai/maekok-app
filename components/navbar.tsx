'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, FileText, ChevronRight } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="bg-gradient-to-r from-blue-800 to-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-white font-bold text-xl">ระบบรายงานโรคจากการปนเปื้อนสารหนู</h1>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link href="/">
                  <Button
                    variant={pathname === '/' ? 'secondary' : 'ghost'}
                    className={`text-white hover:bg-blue-700 ${pathname === '/' ? 'bg-blue-900' : ''}`}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    หน้าหลัก
                  </Button>
                </Link>
                <Link href="/submit">
                  <Button
                    variant={pathname === '/submit' ? 'secondary' : 'ghost'}
                    className={`text-white hover:bg-blue-700 ${pathname === '/submit' ? 'bg-blue-900' : ''}`}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    กรอกข้อมูล
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link href="/">
            <Button
              variant={pathname === '/' ? 'secondary' : 'ghost'}
              className={`w-full text-white justify-start ${pathname === '/' ? 'bg-blue-900' : ''}`}
            >
              <Home className="mr-2 h-4 w-4" />
              หน้าหลัก
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>
          </Link>
          <Link href="/submit">
            <Button
              variant={pathname === '/submit' ? 'secondary' : 'ghost'}
              className={`w-full text-white justify-start ${pathname === '/submit' ? 'bg-blue-900' : ''}`}
            >
              <FileText className="mr-2 h-4 w-4" />
              กรอกข้อมูล
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}