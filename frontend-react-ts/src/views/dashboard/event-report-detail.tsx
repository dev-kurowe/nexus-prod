import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import {
  Users,
  CheckCircle2,
  TrendingUp,
  Calendar,
  MapPin,
  DollarSign,
  ClipboardCheck,
  FileText,
  Loader2,
  ArrowLeft,
  Download,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EventReport {
  event: {
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
  };
  statistics: {
    total_participants: number;
    checked_in_count: number;
    pending_count: number;
    confirmed_count: number;
    attendance_rate: number;
    total_budget_plan: number;
    total_budget_real: number;
    budget_difference: number;
    total_tasks: number;
    completed_tasks: number;
    task_completion_rate: number;
  };
  participants: Array<{
    id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
    status: string;
    qr_code: string;
    created_at: string;
    updated_at: string;
  }>;
}

export default function EventReportDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<EventReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      // Extract event ID from slug or find event first
      fetchEventReport(slug);
    }
  }, [slug]);

  const fetchEventReport = async (eventSlug: string) => {
    try {
      setLoading(true);
      // First, get event by slug to get ID
      const eventResponse = await api.get(`/events/slug/${eventSlug}`);
      if (eventResponse.data.success && eventResponse.data.data) {
        const eventId = eventResponse.data.data.id;
        // Then get report by ID
        const reportResponse = await api.get(`/events/${eventId}/report`);
        if (reportResponse.data.success && reportResponse.data.data) {
          setReport(reportResponse.data.data);
        }
      }
    } catch (error: any) {
      console.error("Error fetching event report:", error);
      if (error.response?.status === 404) {
        // Event tidak ditemukan atau bukan completed event
      }
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExportParticipants = async () => {
    if (!report) return;
    try {
      const response = await api.get(`/export/event/${report.event.id}/participants`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Data_Peserta_${report.event.title}_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error exporting participants:", error);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <SidebarLeft />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        </SidebarInset>
        <SidebarRight />
      </SidebarProvider>
    );
  }

  if (!report) {
    return (
      <SidebarProvider>
        <SidebarLeft />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Laporan Tidak Ditemukan</h3>
            <Button onClick={() => navigate("/dashboard/event-reports")}>
              Kembali ke Daftar Laporan
            </Button>
          </div>
        </SidebarInset>
        <SidebarRight />
      </SidebarProvider>
    );
  }

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
                <Link to="/dashboard/event-reports">Laporan Event</Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{report.event.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/event-reports")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{report.event.title}</h1>
                <p className="text-muted-foreground">Laporan lengkap event yang sudah selesai</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/dashboard/event/${report.event.slug}/performance`)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Lihat Performa
              </Button>
              <Button onClick={handleExportParticipants}>
                <Download className="mr-2 h-4 w-4" />
                Export Peserta
              </Button>
            </div>
          </div>

          {/* Event Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tanggal Event</p>
                    <p className="font-medium">
                      {formatDate(report.event.start_date)} - {formatDate(report.event.end_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Lokasi</p>
                    <p className="font-medium">{report.event.location}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <Badge>{report.event.category}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary">{report.event.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Peserta</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.statistics.total_participants}</div>
                <p className="text-xs text-muted-foreground">
                  {report.statistics.checked_in_count} sudah check-in
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tingkat Kehadiran</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.statistics.attendance_rate.toFixed(1)}%
                </div>
                <Progress value={report.statistics.attendance_rate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Anggaran</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatRupiah(report.statistics.total_budget_real)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rencana: {formatRupiah(report.statistics.total_budget_plan)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Task Selesai</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.statistics.completed_tasks}/{report.statistics.total_tasks}
                </div>
                <Progress
                  value={report.statistics.task_completion_rate}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Participants Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Peserta</CardTitle>
              <CardDescription>
                Total {report.statistics.total_participants} peserta terdaftar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal Daftar</TableHead>
                      <TableHead>Check-in</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.participants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Belum ada peserta terdaftar
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.participants.map((participant, index) => (
                        <TableRow key={participant.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {participant.user.name}
                          </TableCell>
                          <TableCell>{participant.user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                participant.status === "checked_in"
                                  ? "default"
                                  : participant.status === "confirmed"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {participant.status === "checked_in"
                                ? "Hadir"
                                : participant.status === "confirmed"
                                ? "Konfirmasi"
                                : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(participant.created_at)}</TableCell>
                          <TableCell>
                            {participant.status === "checked_in"
                              ? formatDate(participant.updated_at)
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}