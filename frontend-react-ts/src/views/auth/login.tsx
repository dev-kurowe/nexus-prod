import { useState } from "react"
import { Link } from "react-router-dom"
import api from "@/services/api"
import { CalendarDays, MapPin, Search } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function LoginPage() {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    const q = search.trim()
    setSearched(true)
    if (!q) {
      setResults([])
      return
    }
    try {
      setLoadingSearch(true)
      const res = await api.get(`/events?q=${encodeURIComponent(q)}`)
      setResults(res.data?.data || [])
    } catch (err) {
      console.error("Gagal cari event:", err)
      setResults([])
    } finally {
      setLoadingSearch(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2 relative">

      {/* Left: Login Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10 relative z-10 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        {/* Left Illustration - positioned to corners */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top right illustration */}
          <img 
            src="/hero-illustration-left.svg" 
            alt="Workflow Illustration" 
            className="absolute -top-10 -right-20 w-[70%] h-auto opacity-25 rotate-12"
          />
          {/* Bottom left illustration */}
          <img 
            src="/hero-illustration-left.svg" 
            alt="Workflow Illustration" 
            className="absolute -bottom-16 -left-20 w-[60%] h-auto opacity-20 -rotate-12 scale-x-[-1]"
          />
        </div>
        
        {/* Logo and Tagline */}
        <div className="flex flex-col gap-1 items-center md:items-start relative z-10">
          <div className="flex items-center gap-2 font-semibold text-xl">
            <img src="/logo.png" alt="Nexus Logo" className="size-12" />
            <span className="text-slate-800">Nexus</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="flex flex-1 items-center justify-center relative z-10">
          <Card className="w-full max-w-sm shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <LoginForm />
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 relative z-10">
          © 2026 Nexus EMS. All rights reserved.
        </div>
      </div>

      {/* Right: Hero/Landing */}
      <div className="relative hidden lg:block bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 via-transparent to-indigo-900/20" />
        
        {/* Hero Illustration */}
        <div className="absolute inset-0 flex items-center justify-center opacity-25">
          <img 
            src="/hero-illustration.svg" 
            alt="Hero Illustration" 
            className="w-[105%] h-[105%] object-contain"
          />
        </div>

        <div className="relative h-full w-full flex flex-col items-center justify-center p-10 gap-8 z-10">
          <div className="space-y-4 max-w-xl text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-300 font-medium">
              Network, Event Execution & Unified System
            </p>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Event Management System
            </h1>
          </div>

          <div className="space-y-3 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-lg max-w-xl w-full">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-200" />
              <Input
                placeholder="Cari event, lokasi..."
                className="bg-white text-slate-900 border-0 focus-visible:ring-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKey}
              />
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <span onClick={handleSearch}>Cari</span>
              </Button>
            </div>
            {/* <div className="flex flex-wrap gap-4 text-sm text-blue-100">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-4 h-4" /> Jadwal fleksibel
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Event di berbagai kota
              </span>
            </div> */}
          </div>

          {/* <div className="text-sm text-blue-100">
            “Platform event terbaik untuk komunitas dan organisasi. Kami membantu Anda menemukan dan mengelola event dengan mudah.”
          </div> */}

          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-lg max-w-xl w-full space-y-3">
            <p className="text-sm text-blue-100 font-semibold">Hasil Pencarian</p>
            {loadingSearch ? (
              <p className="text-xs text-blue-100">Mencari event...</p>
            ) : results.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scroll">
                <ul className="divide-y divide-white/10">
                  {results.map((ev) => (
                    <li
                      key={ev.id}
                      className="py-3 flex items-start justify-between gap-3 hover:bg-white/5 rounded-lg px-2 transition"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white line-clamp-1">
                          {ev.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-100">
                          <CalendarDays className="w-4 h-4 text-blue-300" />
                          <span>
                            {new Date(ev.start_date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-100">
                          <MapPin className="w-4 h-4 text-red-300" />
                          <span className="line-clamp-1">{ev.location}</span>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="secondary" className="shrink-0">
                        <Link to={`/event/${ev.slug}`}>Detail</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : searched ? (
              <p className="text-xs text-blue-100">Event tidak ditemukan. Coba kata kunci lain.</p>
            ) : (
              <p className="text-xs text-blue-100">Mulai cari event dengan kata kunci.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
