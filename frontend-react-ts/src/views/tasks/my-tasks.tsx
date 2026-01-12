import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { toast } from "sonner";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Zap,
  List,
  TrendingUp,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to_id: number | null;
  proof_file: string | null;
  comments: string | null;
  parsedComments?: any[];
  assigned_to: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  event: {
    id: number;
    title: string;
    slug: string;
  };
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  urgent: {
    label: "Urgent",
    icon: <Zap className="h-4 w-4" />,
    color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300",
  },
  todo: {
    label: "To Do",
    icon: <List className="h-4 w-4" />,
    color: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300",
  },
  "in-progress": {
    label: "In Progress",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300",
  },
  review: {
    label: "Review",
    icon: <Eye className="h-4 w-4" />,
    color: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300",
  },
  overdue: {
    label: "Overdue",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300",
  },
};

export default function MyTasksPage() {
  const { status } = useParams<{ status: string }>();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskDetailDialog, setShowTaskDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [updatingComments, setUpdatingComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchTasks();
    }
  }, [user, status]);

  const fetchTasks = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await api.get(`/tasks/my-tasks`);
      if (response.data.success) {
        let allTasks = response.data.data || [];

        // Parse comments untuk setiap task
        allTasks = allTasks.map((t: any) => {
          let parsedComments: any[] = [];
          if (t.comments) {
            try {
              parsedComments = JSON.parse(t.comments);
            } catch (e) {
              parsedComments = [];
            }
          }
          return { ...t, parsedComments };
        });

        // Filter berdasarkan status
        if (status === "urgent") {
          allTasks = allTasks.filter((task: Task) => task.priority === "high");
        } else if (status === "overdue") {
          const now = new Date();
          allTasks = allTasks.filter(
            (task: Task) =>
              task.due_date &&
              task.status !== "done" &&
              new Date(task.due_date) < now
          );
        } else if (status === "completed") {
          allTasks = allTasks.filter((task: Task) => task.status === "done");
        } else if (status) {
          allTasks = allTasks.filter((task: Task) => task.status === status);
        }

        setTasks(allTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetailDialog(true);
  };

  const handleUploadProof = async (taskId: number, file: File) => {
    if (!file) {
      toast.error("Pilih file terlebih dahulu!");
      return;
    }

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("proof_file", file);

      const response = await api.post(`/tasks/${taskId}/upload-proof`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Bukti pengerjaan berhasil diupload!");
      // Refresh tasks
      await fetchTasks();
      // Update selected task jika sedang dibuka
      if (selectedTask && selectedTask.id === taskId) {
        const updated = response.data?.data || selectedTask;
        let parsedComments: any[] = [];
        if (updated.comments) {
          try {
            parsedComments = JSON.parse(updated.comments);
          } catch (e) {
            parsedComments = [];
          }
        }
        setSelectedTask({ ...updated, parsedComments });
      }
    } catch (error: any) {
      console.error("Gagal upload bukti:", error);
      toast.error(error.response?.data?.message || "Gagal upload bukti pengerjaan. Silakan coba lagi.");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleUpdateComments = async (taskId: number) => {
    if (!newComment.trim()) {
      toast.error("Komentar tidak boleh kosong!");
      return;
    }

    setUpdatingComments(true);
    try {
      const response = await api.put(`/tasks/${taskId}/comments`, {
        comments: newComment.trim(),
      });

      toast.success("Komentar berhasil diupdate!");
      setNewComment("");
      // Refresh tasks
      await fetchTasks();
      // Update selected task jika sedang dibuka
      if (selectedTask && selectedTask.id === taskId) {
        const updated = response.data?.data || selectedTask;
        let parsedComments: any[] = [];
        if (updated.comments) {
          try {
            parsedComments = JSON.parse(updated.comments);
          } catch (e) {
            parsedComments = [];
          }
        }
        setSelectedTask({ ...updated, parsedComments });
      }
    } catch (error: any) {
      console.error("Gagal update komentar:", error);
      toast.error(error.response?.data?.message || "Gagal update komentar. Silakan coba lagi.");
    } finally {
      setUpdatingComments(false);
    }
  };

  // Check permission: hanya user yang ditugaskan yang bisa upload bukti
  const canUploadProof = (task: Task) => {
    return task.assigned_to_id && user?.id === task.assigned_to_id;
  };

  // Check permission: yang bisa melihat bukti adalah user ditugaskan
  const canViewProof = (task: Task) => {
    return canUploadProof(task);
  };

  const getStatusBadge = (task: Task) => {
    const config = statusConfig[task.status] || statusConfig.todo;
    return (
      <Badge variant="outline" className={config.color}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors =
      priority === "high"
        ? "border-red-500 text-red-700 bg-red-50 dark:bg-red-900 dark:text-red-300"
        : priority === "medium"
        ? "border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-300"
        : "border-green-500 text-green-700 bg-green-50 dark:bg-green-900 dark:text-green-300";

    return (
      <Badge variant="outline" className={colors}>
        {priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low"}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const currentStatusConfig = status
    ? statusConfig[status] || statusConfig.todo
    : { label: "All Tasks", icon: null, color: "" };

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
                <BreadcrumbPage>Tasks Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>{currentStatusConfig.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {currentStatusConfig.icon}
                {currentStatusConfig.label}
              </h1>
              <p className="text-muted-foreground mt-1">
                {tasks.length} tugas ditemukan
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Tugas</CardTitle>
              <CardDescription>
                Tugas yang ditugaskan kepada Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Tidak ada tugas untuk kategori ini.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Judul</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioritas</TableHead>
                      <TableHead>Ditugaskan</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/dashboard/event/${task.event.slug}?tab=tugas`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {task.event.title}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </TableCell>
                        <TableCell>{getStatusBadge(task)}</TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>
                          {task.assigned_to ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={task.assigned_to.avatar || undefined}
                                  alt={task.assigned_to.name}
                                />
                                <AvatarFallback>
                                  {task.assigned_to.name?.charAt(0).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.assigned_to.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.due_date ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(task.due_date)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenTaskDetail(task)}
                          >
                            Lihat Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Modal Detail Task */}
          <Dialog
            open={showTaskDetailDialog}
            onOpenChange={setShowTaskDetailDialog}
          >
            <DialogContent className="max-w-2xl">
              {selectedTask && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      {selectedTask.title}
                    </DialogTitle>
                    <DialogDescription>
                      Detail informasi tugas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Status & Priority */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge
                          variant="outline"
                          className={
                            selectedTask.status === "done"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : selectedTask.status === "in-progress"
                              ? "bg-blue-100 text-blue-700 border-blue-300"
                              : selectedTask.status === "review"
                              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                              : "bg-gray-100 text-gray-700 border-gray-300"
                          }
                        >
                          {selectedTask.status === "todo"
                            ? "To Do"
                            : selectedTask.status === "in-progress"
                            ? "In Progress"
                            : selectedTask.status === "review"
                            ? "Review"
                            : "Done"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Prioritas:</span>
                        <Badge
                          variant="outline"
                          className={
                            selectedTask.priority === "high"
                              ? "border-red-500 text-red-700 bg-red-50"
                              : selectedTask.priority === "medium"
                              ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                              : "border-green-500 text-green-700 bg-green-50"
                          }
                        >
                          {selectedTask.priority === "high"
                            ? "High"
                            : selectedTask.priority === "medium"
                            ? "Medium"
                            : "Low"}
                        </Badge>
                      </div>
                    </div>

                    {/* Event Link */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Event</Label>
                      <div className="p-3 bg-muted rounded-md">
                        <Link
                          to={`/dashboard/event/${selectedTask.event.slug}?tab=tugas`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {selectedTask.event.title}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Deskripsi</Label>
                      <div className="p-3 bg-muted rounded-md min-h-[100px]">
                        {selectedTask.description ? (
                          <p className="text-sm whitespace-pre-wrap">
                            {selectedTask.description}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Tidak ada deskripsi
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Assigned To */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Ditugaskan Kepada</Label>
                      {selectedTask.assigned_to ? (
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={selectedTask.assigned_to.avatar || undefined}
                              alt={selectedTask.assigned_to.name}
                            />
                            <AvatarFallback>
                              {selectedTask.assigned_to.name
                                ?.charAt(0)
                                .toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {selectedTask.assigned_to.name || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedTask.assigned_to.email || ""}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm text-muted-foreground italic">
                            Belum ditugaskan kepada siapapun
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Due Date */}
                    {selectedTask.due_date && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Deadline</Label>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm">
                            {new Date(selectedTask.due_date).toLocaleDateString(
                              "id-ID",
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Upload/Lihat Bukti Pengerjaan */}
                    {canViewProof(selectedTask) && (
                      <div className="space-y-2 border-t pt-4">
                        <Label className="text-sm font-medium">Upload Bukti Pengerjaan</Label>
                        {selectedTask.proof_file ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <a
                                href={selectedTask.proof_file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                              >
                                Lihat Bukti Pengerjaan
                              </a>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Upload ulang untuk mengganti bukti
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mb-2">
                            Belum ada bukti pengerjaan
                          </p>
                        )}
                        {canUploadProof(selectedTask) ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUploadProof(selectedTask.id, file);
                                  }
                                }}
                                disabled={uploadingProof}
                                className="flex-1"
                              />
                              {uploadingProof && (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Format yang didukung: JPG, PNG, GIF, WebP, PDF (Max 5MB)
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Hanya pengguna yang ditugaskan yang dapat mengunggah bukti.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Komentar */}
                    <div className="space-y-3 border-t pt-4">
                      <Label className="text-sm font-medium">Komentar</Label>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {selectedTask.parsedComments && selectedTask.parsedComments.length > 0 ? (
                          selectedTask.parsedComments.map((c: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-muted rounded-md"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold">{c.name || "User"}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {c.created_at
                                    ? new Date(c.created_at).toLocaleString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : ""}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{c.text}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground italic">
                              Belum ada komentar
                            </p>
                          </div>
                        )}
                      </div>

                      {canUploadProof(selectedTask) && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Tulis komentar..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={3}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateComments(selectedTask.id)}
                            disabled={updatingComments || !newComment.trim()}
                          >
                            {updatingComments ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyimpan...
                              </>
                            ) : (
                              "Simpan Komentar"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Created & Updated */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Dibuat
                        </Label>
                        <p className="text-sm mt-1">
                          {new Date(selectedTask.created_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Diupdate
                        </Label>
                        <p className="text-sm mt-1">
                          {new Date(selectedTask.updated_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowTaskDetailDialog(false)}
                    >
                      Tutup
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
