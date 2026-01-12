import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Megaphone,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  Users,
  Eye,
  Mail,
  Bell,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface Broadcast {
  id: number;
  title: string;
  message: string;
  type: string;
  target_role: string;
  send_email: boolean;
  send_push: boolean;
  sent_at: string;
  sent_by: number;
  user: {
    id: number;
    name: string;
  };
  read_count: number;
  total_target: number;
  created_at: string;
}

interface BroadcastResponse {
  broadcasts: Broadcast[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface BroadcastStats {
  total_broadcasts: number;
  total_reads: number;
  this_month_broadcasts: number;
}

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  info: { label: "Info", color: "bg-blue-500", icon: <Info className="h-3 w-3" /> },
  success: { label: "Success", color: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  warning: { label: "Warning", color: "bg-yellow-500", icon: <AlertTriangle className="h-3 w-3" /> },
  danger: { label: "Danger", color: "bg-red-500", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function BroadcastsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    target_role: "all",
    send_email: false,
    send_push: true,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["broadcasts", page],
    queryFn: async () => {
      const response = await api.get(`/admin/broadcasts?page=${page}&limit=10`);
      return response.data.data as BroadcastResponse;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["broadcast-stats"],
    queryFn: async () => {
      const response = await api.get("/admin/broadcasts/stats");
      return response.data.data as BroadcastStats;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post("/admin/broadcasts", data);
    },
    onSuccess: () => {
      toast.success("Broadcast berhasil dikirim");
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["broadcast-stats"] });
      setIsCreateOpen(false);
      setFormData({
        title: "",
        message: "",
        type: "info",
        target_role: "all",
        send_email: false,
        send_push: true,
      });
    },
    onError: () => {
      toast.error("Gagal mengirim broadcast");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/admin/broadcasts/${id}`);
    },
    onSuccess: () => {
      toast.success("Broadcast berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["broadcast-stats"] });
    },
    onError: () => {
      toast.error("Gagal menghapus broadcast");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getTypeInfo = (type: string) => {
    return typeConfig[type] || typeConfig.info;
  };

  const getTargetLabel = (target: string) => {
    if (!target || target === "all") return "Semua User";
    return target.charAt(0).toUpperCase() + target.slice(1);
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
              <h1 className="text-2xl font-bold">Broadcast Pesan</h1>
              <p className="text-muted-foreground">
                Kirim pengumuman ke semua atau sebagian pengguna
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Broadcast
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Buat Broadcast Baru</DialogTitle>
                    <DialogDescription>
                      Kirim pesan ke pengguna sistem
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Judul</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Judul pengumuman"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Pesan</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Isi pesan broadcast..."
                          rows={4}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipe Pesan</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(v) => setFormData({ ...formData, type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="info">ℹ️ Info</SelectItem>
                              <SelectItem value="success">✅ Success</SelectItem>
                              <SelectItem value="warning">⚠️ Warning</SelectItem>
                              <SelectItem value="danger">🚨 Danger</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Target</Label>
                          <Select
                            value={formData.target_role}
                            onValueChange={(v) => setFormData({ ...formData, target_role: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Semua User</SelectItem>
                              <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                              <SelectItem value="superadmin">Super Admin</SelectItem>
                              <SelectItem value="ketua himpunan">Ketua Himpunan</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <Label htmlFor="send_email">Kirim via Email</Label>
                          </div>
                          <Switch
                            id="send_email"
                            checked={formData.send_email}
                            onCheckedChange={(v) => setFormData({ ...formData, send_email: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            <Label htmlFor="send_push">Kirim Notifikasi</Label>
                          </div>
                          <Switch
                            id="send_push"
                            checked={formData.send_push}
                            onCheckedChange={(v) => setFormData({ ...formData, send_push: v })}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        <Send className="mr-2 h-4 w-4" />
                        {createMutation.isPending ? "Mengirim..." : "Kirim Broadcast"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Broadcast</CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_broadcasts || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Dibaca</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_reads || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bulan Ini</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.this_month_broadcasts || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Broadcasts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Broadcast</CardTitle>
              <CardDescription>
                Menampilkan {data?.broadcasts?.length || 0} dari {data?.total || 0} broadcast
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
                      <TableHead>Judul</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Dibaca</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.broadcasts?.map((broadcast) => {
                      const typeInfo = getTypeInfo(broadcast.type);
                      return (
                        <TableRow key={broadcast.id}>
                          <TableCell className="whitespace-nowrap">
                            <div>
                              <p className="text-sm">
                                {formatDistanceToNow(new Date(broadcast.created_at), {
                                  addSuffix: true,
                                  locale: id,
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                oleh {broadcast.user?.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <p className="font-medium truncate">{broadcast.title}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {broadcast.message}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${typeInfo.color} text-white`}>
                              {typeInfo.icon}
                              <span className="ml-1">{typeInfo.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {getTargetLabel(broadcast.target_role)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {broadcast.send_push && (
                                <Badge variant="outline" className="text-xs">
                                  <Bell className="h-3 w-3 mr-1" />
                                  Push
                                </Badge>
                              )}
                              {broadcast.send_email && (
                                <Badge variant="outline" className="text-xs">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Email
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {broadcast.read_count} / {broadcast.total_target}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => {
                                setDeleteConfirm({ open: true, id: broadcast.id });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Broadcast</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus broadcast ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm({ open: false, id: null })}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteConfirm.id) {
                  deleteMutation.mutate(deleteConfirm.id);
                }
                setDeleteConfirm({ open: false, id: null });
              }}
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
