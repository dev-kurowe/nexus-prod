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
import { SidebarRight } from "@/components/sidebar-right";
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
import { Calendar, CheckCircle2, Users2, Target, Loader2, TrendingUp, ListTodo } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  total_events: number;
  active_events: number;
  total_participants: number;
  total_budget_plan: number;
  total_budget_real: number;
  pending_approvals: number;
  user_tasks_completed: number;
  user_tasks_total: number;
  user_team_members: number;
  user_active_team_members: number;
  overall_progress: number;
  tasks_in_progress: number;
  daily_registrations: Array<{
    date: string;
    count: number;
  }>;
  faculty_distribution: Array<{
    name: string;
    value: number;
  }>;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
];

// Format tanggal untuk chart
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/dashboard/stats");
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
                <BreadcrumbPage>Executive Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Header dengan Sapaan */}
          <div className="mb-4">
            <h1 className="text-3xl font-bold">
              Selamat Datang, {user?.name || "User"}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Lihat tugas Anda dan kelola event yang Anda ikuti
            </p>
          </div>

          {/* Top Cards (Grid 4 Kolom) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Events */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-sm font-medium">Events</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  Events
                </Badge>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      {stats?.total_events || 0}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Total Events
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>{stats?.active_events || 0} active</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Tasks Completed */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                  Tasks
                </Badge>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      {stats?.user_tasks_completed || 0}/{stats?.user_tasks_total || 0}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Tasks Completed
                    </p>
                    <Progress
                      value={
                        stats?.user_tasks_total
                          ? (stats.user_tasks_completed / stats.user_tasks_total) * 100
                          : 0
                      }
                      className="h-2"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Team Members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-sm font-medium">Team</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                  Team
                </Badge>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      {stats?.user_team_members || 0}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Team Members
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>{stats?.user_active_team_members || 0} active</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 4: Overall Progress */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-sm font-medium">Progress</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                  Progress
                </Badge>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      {Math.round(stats?.overall_progress || 0)}%
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Overall Progress
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3" />
                      <span>{stats?.tasks_in_progress || 0} in progress</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Section (Grid 2 Kolom) */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Chart 1: Tren Pendaftaran Harian (Line Chart) */}
            <Card>
              <CardHeader>
                <CardTitle>Tren Pendaftaran Harian</CardTitle>
                <CardDescription>
                  Grafik pendaftaran peserta dalam 30 hari terakhir
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : stats?.daily_registrations && stats.daily_registrations.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={stats.daily_registrations}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) => formatDate(value as string)}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#0088FE"
                        strokeWidth={2}
                        name="Jumlah Pendaftaran"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Tidak ada data pendaftaran
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Demografi Peserta per Fakultas (Pie Chart) */}
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Status Task</CardTitle>
                <CardDescription>
                  Sebaran tugas berdasarkan status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : stats?.faculty_distribution &&
                  stats.faculty_distribution.some((entry) => entry.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.faculty_distribution.filter(
                          (entry) => entry.value > 0
                        )}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.faculty_distribution
                          .filter((entry) => entry.value > 0)
                          .map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    <div className="rounded-full bg-muted p-6 mb-4">
                      <ListTodo className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground mb-1">
                      Belum Ada Task
                    </p>
                    <p className="text-sm text-muted-foreground max-w-[200px]">
                      Buat task untuk anggota tim di halaman detail event
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
