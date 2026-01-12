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
  TrendingUp,
  Calendar,
  MapPin,
  ArrowLeft,
  Loader2,
  FileText,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  BarChart3,
  PieChart,
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
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface CommitteePerformance {
  user_id: number;
  user_name: string;
  user_email: string;
  division: string;
  position: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  review_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  average_completion_days: number;
}

interface EventPerformance {
  event: {
    id: number;
    title: string;
    slug: string;
    description: string;
    location: string;
    start_date: string;
    end_date: string;
    status: string;
  };
  committee_performance: CommitteePerformance[];
  participant_performance: {
    total_participants: number;
    checked_in_count: number;
    pending_count: number;
    confirmed_count: number;
    rejected_count: number;
    attendance_rate: number;
    certificate_sent_count: number;
    status_distribution: {
      checked_in: number;
      confirmed: number;
      pending: number;
      rejected: number;
    };
    registration_timing: {
      on_time: number;
      late: number;
    };
  };
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function EventPerformancePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [performance, setPerformance] = useState<EventPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPerformance(slug);
    }
  }, [slug]);

  const fetchPerformance = async (eventSlug: string) => {
    try {
      setLoading(true);
      // First, get event by slug to get ID
      const eventResponse = await api.get(`/events/slug/${eventSlug}`);
      if (eventResponse.data.success && eventResponse.data.data) {
        const eventId = eventResponse.data.data.id;
        // Then get performance by ID
        const performanceResponse = await api.get(`/events/${eventId}/performance`);
        if (performanceResponse.data.success && performanceResponse.data.data) {
          setPerformance(performanceResponse.data.data);
        }
      }
    } catch (error: any) {
      console.error("Error fetching event performance:", error);
      if (error.response?.status === 404) {
        // Event tidak ditemukan
      }
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

  if (!performance) {
    return (
      <SidebarProvider>
        <SidebarLeft />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Laporan Performa Tidak Ditemukan</h3>
            <Button onClick={() => navigate("/dashboard/event-reports")}>
              Kembali ke Daftar Laporan
            </Button>
          </div>
        </SidebarInset>
        <SidebarRight />
      </SidebarProvider>
    );
  }

  // Prepare data for charts - dengan null check yang lebih aman
  const participantPerf = performance?.participant_performance ?? {
    total_participants: 0,
    checked_in_count: 0,
    pending_count: 0,
    confirmed_count: 0,
    rejected_count: 0,
    attendance_rate: 0,
    certificate_sent_count: 0,
    status_distribution: { checked_in: 0, confirmed: 0, pending: 0, rejected: 0 },
    registration_timing: { on_time: 0, late: 0 },
  };

  const statusChartData = [
    { name: "Hadir", value: participantPerf?.status_distribution?.checked_in ?? 0 },
    { name: "Konfirmasi", value: participantPerf?.status_distribution?.confirmed ?? 0 },
    { name: "Pending", value: participantPerf?.status_distribution?.pending ?? 0 },
    { name: "Ditolak", value: participantPerf?.status_distribution?.rejected ?? 0 },
  ].filter(item => item.value > 0);

  const registrationTimingData = [
    { name: "Tepat Waktu", value: participantPerf?.registration_timing?.on_time ?? 0 },
    { name: "Terlambat", value: participantPerf?.registration_timing?.late ?? 0 },
  ].filter(item => item.value > 0);

  const committeePerf = (performance?.committee_performance && Array.isArray(performance.committee_performance)) 
    ? performance.committee_performance 
    : [];

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
                <BreadcrumbPage>Performa - {performance.event?.title || "Loading..."}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/event/${performance.event?.slug || ""}/report`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Laporan Performa</h1>
                <p className="text-muted-foreground">{performance.event?.title || "Loading..."}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate(`/dashboard/event/${performance.event?.slug || ""}/report`)}>
              <FileText className="mr-2 h-4 w-4" />
              Kembali ke Laporan
            </Button>
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
                      {performance.event?.start_date ? formatDate(performance.event.start_date) : "-"} - {performance.event?.end_date ? formatDate(performance.event.end_date) : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Lokasi</p>
                    <p className="font-medium">{performance.event?.location || "-"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participant Performance Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Peserta</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{participantPerf.total_participants}</div>
                <p className="text-xs text-muted-foreground">
                  {participantPerf.checked_in_count} sudah check-in
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
                  {participantPerf.attendance_rate.toFixed(1)}%
                </div>
                <Progress value={participantPerf.attendance_rate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sertifikat Terkirim</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{participantPerf.certificate_sent_count}</div>
                <p className="text-xs text-muted-foreground">
                  dari {participantPerf.total_participants} peserta
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Panitia</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{committeePerf.length}</div>
                <p className="text-xs text-muted-foreground">panitia aktif</p>
              </CardContent>
            </Card>
          </div>

          {/* Participant Performance Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Status Peserta</CardTitle>
                <CardDescription>Breakdown status pendaftaran peserta</CardDescription>
              </CardHeader>
              <CardContent>
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Tidak ada data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Waktu Pendaftaran</CardTitle>
                <CardDescription>Pendaftaran tepat waktu vs terlambat</CardDescription>
              </CardHeader>
              <CardContent>
                {registrationTimingData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={registrationTimingData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Tidak ada data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Committee Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Performa Panitia</CardTitle>
              <CardDescription>Statistik performa setiap panitia dalam event</CardDescription>
            </CardHeader>
            <CardContent>
              {committeePerf.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Tidak ada panitia di event ini
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Panitia</TableHead>
                        <TableHead>Divisi</TableHead>
                        <TableHead>Jabatan</TableHead>
                        <TableHead>Total Task</TableHead>
                        <TableHead>Selesai</TableHead>
                        <TableHead>In Progress</TableHead>
                        <TableHead>To Do</TableHead>
                        <TableHead>Review</TableHead>
                        <TableHead>Overdue</TableHead>
                        <TableHead>Completion Rate</TableHead>
                        <TableHead>Rata-rata Hari</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {committeePerf.map((committee) => (
                        <TableRow key={committee.user_id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{committee.user_name}</div>
                              <div className="text-xs text-muted-foreground">{committee.user_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{committee.division || "-"}</Badge>
                          </TableCell>
                          <TableCell>{committee.position || "-"}</TableCell>
                          <TableCell>{committee.total_tasks}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span>{committee.completed_tasks}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <span>{committee.in_progress_tasks}</span>
                            </div>
                          </TableCell>
                          <TableCell>{committee.todo_tasks}</TableCell>
                          <TableCell>{committee.review_tasks}</TableCell>
                          <TableCell>
                            {committee.overdue_tasks > 0 ? (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <span className="text-red-600">{committee.overdue_tasks}</span>
                              </div>
                            ) : (
                              <span>0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{committee.completion_rate.toFixed(1)}%</span>
                              <Progress value={committee.completion_rate} className="h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {committee.average_completion_days > 0 ? (
                              <span>{committee.average_completion_days.toFixed(1)} hari</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}