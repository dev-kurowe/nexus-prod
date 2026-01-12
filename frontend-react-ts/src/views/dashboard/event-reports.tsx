import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, CheckCircle2, TrendingUp, Calendar, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

interface CompletedEvent {
  id: number;
  title: string;
  slug: string;
  description: string;
  banner: string;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
  category: string;
  quota: number;
  created_by: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export default function EventReportsPage() {
  const [events, setEvents] = useState<CompletedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompletedEvents();
  }, []);

  const fetchCompletedEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/events/completed");
      if (response.data.success) {
        setEvents(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching completed events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Laporan Event</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Laporan Event</h1>
              <p className="text-muted-foreground">
                Lihat laporan dan statistik event yang sudah selesai
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Event Selesai</h3>
                <p className="text-muted-foreground text-center">
                  Event yang sudah selesai akan muncul di sini untuk dilihat laporannya.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {event.banner && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={event.banner}
                        alt={event.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Badge className="absolute top-2 right-2" variant="secondary">
                        Selesai
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.end_date)}</span>
                    </CardDescription>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{event.location}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/dashboard/event/${event.slug}/report`)}
                    >
                      Lihat Laporan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}