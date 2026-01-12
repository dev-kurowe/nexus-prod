import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, MapPin, Clock, Users, Filter, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isSameDay, startOfMonth, endOfMonth, isWithinInterval, startOfDay } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Event {
  id: number;
  title: string;
  slug: string;
  description: string;
  banner: string;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
  event_type: string;
  quota: number;
  category: string;
  price: number;
  created_at: string;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch all events (including done/completed events for calendar)
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["events", "calendar"],
    queryFn: async () => {
      const response = await api.get("/events?include_done=true");
      return response.data.data;
    },
  });

  const events: Event[] = eventsData || [];

  // Filter events by status
  const filteredEvents = events.filter((event) => {
    if (filterStatus === "all") return true;
    return event.status === filterStatus;
  });

  // Helper function to parse date string and extract local date (ignoring timezone)
  const parseEventDate = (dateStr: string): Date => {
    // If the date string contains 'T', it's ISO format - extract just the date part
    // to avoid timezone conversion issues
    if (dateStr.includes('T')) {
      const datePart = dateStr.split('T')[0]; // "2026-01-14"
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    // Otherwise, parse normally
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Get events for selected date
  const eventsOnSelectedDate = filteredEvents.filter((event) => {
    if (!selectedDate) return false;
    const eventDate = parseEventDate(event.start_date);
    return isSameDay(eventDate, startOfDay(selectedDate));
  });

  // Get events for selected month
  const eventsInMonth = filteredEvents.filter((event) => {
    const eventDate = parseEventDate(event.start_date);
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    return isWithinInterval(eventDate, { start: monthStart, end: monthEnd });
  });

  // Get dates that have events
  const datesWithEvents = filteredEvents.map((event) => parseEventDate(event.start_date));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500";
      case "draft":
        return "bg-yellow-500";
      case "done":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "online": return "Online";
      case "hybrid": return "Hybrid";
      default: return "Offline";
    }
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <div className="flex flex-col gap-4 p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">📅 Kalender Acara</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Lihat jadwal semua event dalam kalender
            </p>
          </div>

          <Separator />

          {/* Filter Tabs */}
          <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
              <TabsTrigger value="all">Semua</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="done">Selesai</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Calendar Section */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Kalender
                </CardTitle>
                <CardDescription>Pilih tanggal untuk lihat event</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  className="rounded-md border"
                  modifiers={{
                    hasEvent: datesWithEvents,
                  }}
                  modifiersStyles={{
                    hasEvent: {
                      fontWeight: "bold",
                      textDecoration: "underline",
                      color: "#3b82f6",
                    },
                  }}
                />
                <div className="mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Tanggal yang memiliki event</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Events List Section */}
            <div className="lg:col-span-2 space-y-4">
              {/* Events on Selected Date */}
              {selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">
                      Event pada {format(selectedDate, "dd MMMM yyyy", { locale: localeID })}
                    </CardTitle>
                    <CardDescription>
                      {eventsOnSelectedDate.length} event ditemukan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Memuat data...
                      </div>
                    ) : eventsOnSelectedDate.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Tidak ada event pada tanggal ini
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {eventsOnSelectedDate.map((event) => (
                          <Card key={event.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row gap-4">
                                {/* Event Banner */}
                                {event.banner && (
                                  <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img
                                      src={`http://localhost:8000/${event.banner}`}
                                      alt={event.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}

                                {/* Event Info */}
                                <div className="flex-1 space-y-2">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <h3 className="font-semibold text-base md:text-lg">
                                      {event.title}
                                    </h3>
                                    <div className="flex gap-2">
                                      <Badge variant="outline">
                                        {getEventTypeLabel(event.event_type)}
                                      </Badge>
                                      <Badge className={getStatusColor(event.status)}>
                                        {event.status}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4" />
                                      {format(new Date(event.start_date), "HH:mm", {
                                        locale: localeID,
                                      })}{" "}
                                      WIB
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      {event.location}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4" />
                                      Kuota: {event.quota}
                                    </div>
                                    {event.price > 0 && (
                                      <div className="flex items-center gap-2 font-semibold text-green-600">
                                        Rp {event.price.toLocaleString("id-ID")}
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => navigate(`/dashboard/event/${event.slug}`)}
                                  >
                                    Lihat Detail
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* All Events in Month */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">
                    Semua Event Bulan{" "}
                    {format(selectedMonth, "MMMM yyyy", { locale: localeID })}
                  </CardTitle>
                  <CardDescription>
                    {eventsInMonth.length} event di bulan ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Memuat data...
                    </div>
                  ) : eventsInMonth.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada event di bulan ini
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {eventsInMonth
                        .sort(
                          (a, b) =>
                            parseEventDate(a.start_date).getTime() -
                            parseEventDate(b.start_date).getTime()
                        )
                        .map((event) => (
                          <div
                            key={event.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => navigate(`/dashboard/event/${event.slug}`)}
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <div className="text-center min-w-[50px]">
                                <div className="text-2xl font-bold">
                                  {format(parseEventDate(event.start_date), "dd")}
                                </div>
                                <div className="text-xs text-muted-foreground uppercase">
                                  {format(parseEventDate(event.start_date), "MMM", {
                                    locale: localeID,
                                  })}
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{event.title}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(event.start_date), "HH:mm")} WIB
                                  <span className="mx-2">•</span>
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2 sm:mt-0">
                              <Badge variant="outline" className="text-xs">
                                {getEventTypeLabel(event.event_type)}
                              </Badge>
                              <Badge className={`${getStatusColor(event.status)} text-xs`}>
                                {event.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
