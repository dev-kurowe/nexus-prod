import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Search,
  RefreshCw,
  Calendar,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Edit,
  Trash,
  Plus,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

interface ActivityItem {
  id: number;
  user_id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  activity_type: string;
  entity_type: string;
  entity_id: number;
  description: string;
  created_at: string;
}

interface ActivityResponse {
  activities: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  today_count: number;
  type_stats: { activity_type: string; count: number }[];
}

const activityTypeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  event_created: { label: "Event Dibuat", color: "bg-green-500", icon: <Plus className="h-3 w-3" /> },
  event_updated: { label: "Event Diupdate", color: "bg-blue-500", icon: <Edit className="h-3 w-3" /> },
  event_published: { label: "Event Dipublish", color: "bg-purple-500", icon: <Eye className="h-3 w-3" /> },
  event_deleted: { label: "Event Dihapus", color: "bg-red-500", icon: <Trash className="h-3 w-3" /> },
  task_created: { label: "Task Dibuat", color: "bg-cyan-500", icon: <Plus className="h-3 w-3" /> },
  task_completed: { label: "Task Selesai", color: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  task_assigned: { label: "Task Ditugaskan", color: "bg-orange-500", icon: <User className="h-3 w-3" /> },
  registration_approved: { label: "Registrasi Disetujui", color: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  registration_rejected: { label: "Registrasi Ditolak", color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
  loan_approved: { label: "Peminjaman Disetujui", color: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  loan_rejected: { label: "Peminjaman Ditolak", color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
};

export default function AdminActivitiesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-activities", page, search, typeFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.append("search", search);
      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);
      if (entityFilter && entityFilter !== "all") params.append("entity_type", entityFilter);

      const response = await api.get(`/admin/activities?${params}`);
      return response.data.data as ActivityResponse;
    },
  });

  const getActivityInfo = (type: string) => {
    return activityTypeLabels[type] || { label: type, color: "bg-gray-500", icon: <Activity className="h-3 w-3" /> };
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Aktivitas Terbaru</h1>
              <p className="text-muted-foreground">
                Monitor semua aktivitas yang terjadi di sistem
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Aktivitas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.total || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.today_count || 0}</div>
              </CardContent>
            </Card>
            {data?.type_stats?.slice(0, 2).map((stat, idx) => (
              <Card key={idx}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {getActivityInfo(stat.activity_type).label}
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.count}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari aktivitas..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tipe Aktivitas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="event_created">Event Dibuat</SelectItem>
                    <SelectItem value="event_updated">Event Diupdate</SelectItem>
                    <SelectItem value="event_published">Event Dipublish</SelectItem>
                    <SelectItem value="task_completed">Task Selesai</SelectItem>
                    <SelectItem value="task_assigned">Task Ditugaskan</SelectItem>
                    <SelectItem value="registration_approved">Registrasi Disetujui</SelectItem>
                    <SelectItem value="registration_rejected">Registrasi Ditolak</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tipe Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Entity</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="registration">Registrasi</SelectItem>
                    <SelectItem value="loan">Peminjaman</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Activities Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Aktivitas</CardTitle>
              <CardDescription>
                Menampilkan {data?.activities?.length || 0} dari {data?.total || 0} aktivitas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Entity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.activities?.map((activity) => {
                      const info = getActivityInfo(activity.activity_type);
                      return (
                        <TableRow key={activity.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                              locale: id,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{activity.user?.name || "System"}</p>
                                <p className="text-xs text-muted-foreground">{activity.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${info.color} text-white`}>
                              {info.icon}
                              <span className="ml-1">{info.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {activity.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {activity.entity_type} #{activity.entity_id}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {data && data.total_pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {data.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                    disabled={page === data.total_pages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
