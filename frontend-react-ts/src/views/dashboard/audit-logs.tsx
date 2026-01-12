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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  RefreshCw,
  Calendar,
  Eye,
  LogIn,
  LogOut,
  Edit,
  Trash,
  Plus,
  Globe,
  Monitor,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { id } from "date-fns/locale";

interface AuditLog {
  id: number;
  user_id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  action: string;
  entity_type: string;
  entity_id: number;
  old_value: string;
  new_value: string;
  ip_address: string;
  user_agent: string;
  description: string;
  created_at: string;
}

interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface AuditStats {
  action_stats: { action: string; count: number }[];
  entity_stats: { entity_type: string; count: number }[];
  total_logs: number;
  today_logs: number;
}

const actionLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  create: { label: "Create", color: "bg-green-500", icon: <Plus className="h-3 w-3" /> },
  update: { label: "Update", color: "bg-blue-500", icon: <Edit className="h-3 w-3" /> },
  delete: { label: "Delete", color: "bg-red-500", icon: <Trash className="h-3 w-3" /> },
  login: { label: "Login", color: "bg-purple-500", icon: <LogIn className="h-3 w-3" /> },
  logout: { label: "Logout", color: "bg-gray-500", icon: <LogOut className="h-3 w-3" /> },
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", page, search, actionFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.append("search", search);
      if (actionFilter && actionFilter !== "all") params.append("action", actionFilter);
      if (entityFilter && entityFilter !== "all") params.append("entity_type", entityFilter);

      const response = await api.get(`/admin/audit-logs?${params}`);
      return response.data.data as AuditLogResponse;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["audit-logs-stats"],
    queryFn: async () => {
      const response = await api.get("/admin/audit-logs/stats");
      return response.data.data as AuditStats;
    },
  });

  const getActionInfo = (action: string) => {
    return actionLabels[action] || { label: action, color: "bg-gray-500", icon: <FileText className="h-3 w-3" /> };
  };

  const parseJSON = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
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
              <h1 className="text-2xl font-bold">Audit Logs</h1>
              <p className="text-muted-foreground">
                Lacak semua perubahan data dan aktivitas pengguna
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
                <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_logs || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.today_logs || 0}</div>
              </CardContent>
            </Card>
            {stats?.action_stats?.slice(0, 2).map((stat, idx) => (
              <Card key={idx}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {getActionInfo(stat.action).label}
                  </CardTitle>
                  {getActionInfo(stat.action).icon}
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
                      placeholder="Cari berdasarkan IP atau deskripsi..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Aksi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Aksi</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Entity</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="system_setting">System Setting</SelectItem>
                    <SelectItem value="broadcast">Broadcast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Log</CardTitle>
              <CardDescription>
                Menampilkan {data?.logs?.length || 0} dari {data?.total || 0} log
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
                      <TableHead>Aksi</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.logs?.map((log) => {
                      const actionInfo = getActionInfo(log.action);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDistanceToNow(new Date(log.created_at), {
                              addSuffix: true,
                              locale: id,
                            })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{log.user?.name || "System"}</p>
                              <p className="text-xs text-muted-foreground">{log.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${actionInfo.color} text-white`}>
                              {actionInfo.icon}
                              <span className="ml-1">{actionInfo.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.entity_type && (
                              <Badge variant="outline">
                                {log.entity_type} #{log.entity_id}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {log.description}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Globe className="h-3 w-3" />
                              {log.ip_address || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Detail Audit Log</DialogTitle>
                                  <DialogDescription>
                                    {format(new Date(log.created_at), "dd MMMM yyyy, HH:mm:ss", { locale: id })}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">User</p>
                                      <p>{log.user?.name} ({log.user?.email})</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Aksi</p>
                                      <Badge className={`${actionInfo.color} text-white`}>
                                        {actionInfo.label}
                                      </Badge>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                                      <p className="flex items-center gap-1">
                                        <Globe className="h-4 w-4" /> {log.ip_address || "-"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Entity</p>
                                      <p>{log.entity_type} #{log.entity_id}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Deskripsi</p>
                                    <p>{log.description}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                      <Monitor className="h-4 w-4" /> User Agent
                                    </p>
                                    <p className="text-sm text-muted-foreground break-all">{log.user_agent || "-"}</p>
                                  </div>
                                  {log.old_value && (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Data Lama</p>
                                      <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                        {JSON.stringify(parseJSON(log.old_value), null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.new_value && (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Data Baru</p>
                                      <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                        {JSON.stringify(parseJSON(log.new_value), null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
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
