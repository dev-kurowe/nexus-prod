import { useEffect, useState } from "react";
import api from "../../../services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  total_events: number;
  total_participants: number;
  pending_approvals: number;
  daily_registrations: {
    date: string;
    count: number;
  }[];
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/dashboard/stats");
        const statsData = response.data.data;
        console.log("Dashboard stats data:", statsData);
        console.log("Daily registrations:", statsData.daily_registrations);
        setStats(statsData);
      } catch (err: any) {
        console.error("Error fetching dashboard stats:", err);
        setError(
          err.response?.data?.message || "Gagal memuat data statistik"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Format date untuk chart
  const formatChartDate = (dateStr: string) => {
    try {
      // Handle format YYYY-MM-DD
      const date = new Date(dateStr + "T00:00:00");
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      return date.toLocaleDateString("id-ID", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Loading Chart */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistik Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Event */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Event</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_events || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Semua event yang dibuat
            </p>
          </CardContent>
        </Card>

        {/* Total Peserta */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Peserta</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_participants || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Semua pendaftaran
            </p>
          </CardContent>
        </Card>

        {/* Butuh Verifikasi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Butuh Verifikasi
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.pending_approvals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pendaftaran pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafik Pendaftaran Harian */}
      <Card>
        <CardHeader>
          <CardTitle>Pendaftaran Harian (30 Hari Terakhir)</CardTitle>
          {stats && stats.daily_registrations && (
            <p className="text-xs text-muted-foreground mt-1">
              Total data: {stats.daily_registrations.length} | 
              Total pendaftaran: {stats.daily_registrations.reduce((sum, d) => sum + d.count, 0)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {stats && stats.daily_registrations && stats.daily_registrations.length > 0 ? (
            <div className="w-full" style={{ minHeight: "300px" }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={stats.daily_registrations}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  barSize={30}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    style={{ fontSize: "12px", fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    style={{ fontSize: "12px", fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  cursor={{ fill: "transparent" }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    }}
                    formatter={(value: number) => [`${value}`, "Pendaftaran"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    stroke="#2563eb"
                    strokeWidth={1}
                    minPointSize={2}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
              <p>Belum ada data pendaftaran</p>
              {stats && stats.daily_registrations && (
                <p className="text-xs">
                  (Data array: {stats.daily_registrations.length} items)
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
