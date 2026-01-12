import { useEffect, useState } from "react";
import api from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Search, LogIn, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Cookies from "js-cookie";

interface EventItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  location: string;
  start_date: string;
  category?: string;
  banner?: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isLoggedIn = !!Cookies.get("token");
  
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  const categories = ["Semua", "Seminar", "Workshop", "Konser", "Lomba", "Exhibition"];

  const fetchEvents = async (q?: string, category?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.append("q", q);
      if (category && category !== "Semua") params.append("category", category);
      const queryString = params.toString();
      const res = await api.get(`/events${queryString ? `?${queryString}` : ""}`);
      setEvents(res.data.data || []);
    } catch (err) {
      console.error("Gagal mengambil event:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(undefined, selectedCategory);
  }, [selectedCategory]);

  const handleSearch = () => {
    setKeyword(search);
    fetchEvents(search.trim(), selectedCategory);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    fetchEvents(keyword.trim() || undefined, category);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">      {/* Top Navigation Bar */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/events" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              E
            </div>
            <span className="text-xl font-bold text-slate-900">Event Hub</span>
          </Link>
          
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <span className="text-sm text-slate-600 hidden md:inline">
                  Hi, <span className="font-semibold">{user?.name || "User"}</span>
                </span>
                <Button 
                  onClick={() => navigate("/dashboard")}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => navigate("/login")}
                  size="sm"
                  variant="ghost"
                >
                  Masuk
                </Button>
                <Button 
                  onClick={() => navigate("/register")}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Daftar
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      {/* Hero */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm uppercase tracking-[0.25em] text-blue-200">
              Event Organizer
            </p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              Temukan Event Seru di Sekitarmu!
            </h1>
            <p className="text-lg text-blue-100">
              Bergabung dengan ribuan peserta lainnya dalam berbagai event menarik.
            </p>
          </div>

          {/* Search bar */}
          <div className="mt-8 bg-white/10 backdrop-blur rounded-xl p-3 shadow-lg">
            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                <Search className="w-5 h-5 text-slate-500" />
                <Input
                  className="border-0 focus-visible:ring-0"
                  placeholder="Cari event, lokasi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKey}
                />
              </div>
              <Button
                onClick={handleSearch}
                className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Cari
              </Button>
            </div>
            {keyword && (
              <p className="text-xs text-blue-100 mt-2">
                Menampilkan hasil untuk: <span className="font-semibold">{keyword}</span>
              </p>
            )}
          </div>

          {/* Category Filter Bar */}
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white shadow-lg scale-105"
                    : "bg-white/10 text-blue-100 hover:bg-white/20"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* List Events */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Event Terbaru</h2>
            <p className="text-sm text-slate-500">
              Temukan event yang sesuai minatmu.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Memuat event...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-14 border border-dashed rounded-lg bg-white">
            <p className="text-lg font-semibold text-slate-700">
              Event tidak ditemukan
            </p>
            <p className="text-sm text-slate-500">
              Coba kata kunci lain.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="flex flex-col overflow-hidden">
                <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                  {event.banner ? (
                    <img
                      src={event.banner}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">No Banner</span>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-1 flex-1">
                      {event.title}
                    </CardTitle>
                    {event.category && (
                      <Badge variant="secondary" className="shrink-0">
                        {event.category}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>
                      {new Date(event.start_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="line-clamp-2">{event.location}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/event/${event.slug}`}>Lihat Detail</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
