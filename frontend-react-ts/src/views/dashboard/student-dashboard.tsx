import { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import { UserNav } from "@/components/user-nav";
import { DashboardCalendar } from "@/components/dashboard-calendar";
import { RecentActivity } from "@/components/recent-activity";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CheckCircle2, Ticket, Clock, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Registration {
  id: number;
  event: {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    location: string;
    event_type: string;
    slug: string;
  };
  status: string;
  attendance: boolean;
  created_at: string;
}

interface Event {
  id: number;
  title: string;
  slug: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
  event_type: string;
  quota: number;
  registered_count: number;
  available_quota: number;
  price: number;
}

interface DashboardStats {
  total_registrations: number;
  confirmed_tickets: number;
  attended_events: number;
  pending_tickets: number;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Registration[]>([]);
  const [publishedEvents, setPublishedEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch registrations - gunakan endpoint yang benar
      const registrationsRes = await api.get("/user/registrations");
      const registrations: Registration[] = registrationsRes.data.data || [];

      console.log("📋 Total Registrations:", registrations.length);
      console.log("📋 Registrations data:", registrations);
      console.log("📋 First event structure:", registrations[0]?.event);

      // Calculate stats
      const confirmed = registrations.filter(r => r.status === "confirmed").length;
      const attended = registrations.filter(r => r.attendance === true).length;
      const pending = registrations.filter(r => r.status === "pending").length;

      setStats({
        total_registrations: registrations.length,
        confirmed_tickets: confirmed,
        attended_events: attended,
        pending_tickets: pending,
      });

      // Get upcoming events (confirmed atau pending, not attended yet, date in future or today)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Reset jam ke 00:00:00
      
      const upcoming = registrations
        .filter(r => {
          const eventDate = new Date(r.event.start_date);
          const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
          
          const isUpcoming = (r.status === "confirmed" || r.status === "pending") && 
                           !r.attendance &&
                           eventDateOnly >= today; // Compare hanya tanggal, bukan jam
          
          console.log(`Event: ${r.event.title}, Status: ${r.status}, Date: ${eventDate.toLocaleDateString()}, EventDateOnly: ${eventDateOnly.toLocaleDateString()}, Today: ${today.toLocaleDateString()}, IsUpcoming: ${isUpcoming}`);
          return isUpcoming;
        })
        .slice(0, 3);

      console.log("📅 Upcoming Events:", upcoming.length);
      setUpcomingEvents(upcoming);

      // Extract registered event IDs
      const eventIds = registrations.map(r => r.event.id);
      setRegisteredEventIds(eventIds);

      // Fetch published events
      const eventsRes = await api.get("/events");
      const allEvents: Event[] = eventsRes.data.data || [];
      const published = allEvents.filter(e => e.status === "published").slice(0, 6);
      setPublishedEvents(published);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard Mahasiswa</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <UserNav />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="container mx-auto py-6 space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
              <h1 className="text-3xl font-bold mb-2">
                Selamat Datang, {user?.name}! 👋
              </h1>
              <p className="text-blue-100">
                Kelola tiket event dan lihat aktivitas Anda di sini
              </p>
            </div>

            {/* Stats Cards */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pendaftaran
                    </CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.total_registrations || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Semua event yang didaftar
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Tiket Terkonfirmasi
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.confirmed_tickets || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Siap untuk digunakan
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Event Dihadiri
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.attended_events || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Sudah check-in
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Menunggu Konfirmasi
                    </CardTitle>
                    <Clock className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.pending_tickets || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Sedang diproses
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Menu Cepat</CardTitle>
                <CardDescription>Akses fitur dengan cepat</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2"
                  onClick={() => navigate("/my-tickets")}
                >
                  <Ticket className="h-6 w-6" />
                  <span>Tiket Saya</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2"
                  onClick={() => navigate("/inbox")}
                >
                  <Mail className="h-6 w-6" />
                  <span>Notifikasi</span>
                </Button>
              </CardContent>
            </Card>

            {/* Calendar & Recent Activity Section */}
            <div className="grid gap-4 md:grid-cols-2">
              <DashboardCalendar />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentActivity />
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Event Mendatang</CardTitle>
                <CardDescription>Event yang akan Anda hadiri</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-4 pb-4 border-b last:border-0">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Belum ada event mendatang</p>
                    <p className="text-sm mt-1">Daftar event tersedia di bawah untuk mulai berpartisipasi</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((registration) => (
                      <div 
                        key={registration.id} 
                        className="flex items-start gap-4 pb-4 border-b last:border-0 hover:bg-muted/50 rounded-lg p-3 transition-colors cursor-pointer"
                        onClick={() => navigate(`/event/${registration.event.id}`)}
                      >
                        <div className="bg-blue-100 rounded-lg p-3 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">
                            {registration.event.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {formatDate(registration.event.start_date)}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {registration.event.event_type === "online" ? "Online" : "Offline"}
                            </Badge>
                            {registration.status === "pending" && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                Menunggu Konfirmasi
                              </Badge>
                            )}
                            {registration.status === "confirmed" && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                Terkonfirmasi
                              </Badge>
                            )}
                            {registration.event.location && (
                              <span className="text-xs text-muted-foreground">
                                📍 {registration.event.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Lihat Detail
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Tersedia / Published Events */}
            <Card>
              <CardHeader>
                <CardTitle>Event Tersedia</CardTitle>
                <CardDescription>Daftar event yang dapat Anda ikuti</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="border rounded-lg p-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    ))}
                  </div>
                ) : publishedEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Belum ada event tersedia saat ini</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {publishedEvents.map((event) => {
                      const isRegistered = registeredEventIds.includes(event.id);
                      
                      return (
                      <div 
                        key={event.id} 
                        className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/event/${event.slug}`)}
                      >
                        <div>
                          <h4 className="font-semibold line-clamp-2 mb-1">
                            {event.title}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(event.start_date)}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              📍 {event.location}
                            </div>
                          )}
                          {event.quota > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">
                                {event.available_quota} slot tersisa
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {event.event_type === "online" ? "Online" : "Offline"}
                          </Badge>
                          {event.price !== undefined && (
                            <span className="text-xs font-semibold text-green-600">
                              {event.price === 0 ? "GRATIS" : `Rp ${event.price.toLocaleString('id-ID')}`}
                            </span>
                          )}
                        </div>
                        <Button 
                          variant={isRegistered ? "secondary" : "default"} 
                          size="sm" 
                          className="w-full"
                          disabled={isRegistered}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isRegistered) {
                              navigate(`/event/${event.slug}`);
                            }
                          }}
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Sudah Terdaftar
                            </>
                          ) : (
                            "Daftar Sekarang"
                          )}
                        </Button>
                      </div>
                    )})}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips Section */}
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💡 Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Pastikan tiket Anda sudah terkonfirmasi sebelum hari H</p>
                <p>• Download atau simpan QR code tiket untuk check-in</p>
                <p>• Periksa notifikasi untuk informasi penting dari panitia</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
