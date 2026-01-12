import { useEffect, useState } from "react";
import api from "../../services/api";
import { toast } from "sonner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
  Award,
  CreditCard,
  Users,
  ClipboardList,
  Package,
  Megaphone,
  Trash2,
  CheckCheck,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  entity_type: string;
  entity_id: number;
  action_url: string;
  created_at: string;
}

// Helper function untuk mendapatkan icon berdasarkan tipe notifikasi
function getNotificationIcon(type: string) {
  switch (type) {
    case "registration_submitted":
      return <Clock className="h-5 w-5 text-blue-500" />;
    case "registration_approved":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "registration_rejected":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "event_reminder":
      return <CalendarCheck className="h-5 w-5 text-purple-500" />;
    case "certificate_ready":
      return <Award className="h-5 w-5 text-yellow-500" />;
    case "payment_success":
      return <CreditCard className="h-5 w-5 text-green-500" />;
    case "payment_pending":
      return <CreditCard className="h-5 w-5 text-orange-500" />;
    case "new_registration":
      return <Users className="h-5 w-5 text-blue-500" />;
    case "task_assigned":
      return <ClipboardList className="h-5 w-5 text-blue-500" />;
    case "task_deadline":
      return <Clock className="h-5 w-5 text-orange-500" />;
    case "task_completed":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "loan_request":
    case "loan_approved":
    case "loan_rejected":
      return <Package className="h-5 w-5 text-purple-500" />;
    case "committee_added":
      return <Users className="h-5 w-5 text-indigo-500" />;
    case "event_published":
      return <Megaphone className="h-5 w-5 text-green-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

// Helper function untuk warna badge berdasarkan tipe
function getNotificationBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  if (type.includes("approved") || type.includes("success") || type.includes("completed") || type.includes("published")) {
    return "default";
  }
  if (type.includes("rejected") || type.includes("deadline")) {
    return "destructive";
  }
  if (type.includes("pending") || type.includes("submitted") || type.includes("assigned")) {
    return "secondary";
  }
  return "outline";
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchNotifications = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      const response = await api.get(`/notifications?page=${pageNum}&limit=20`);
      if (response.data.success) {
        const newNotifications = response.data.data.notifications || [];
        if (append) {
          setNotifications((prev) => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }
        setHasMore(newNotifications.length === 20);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Gagal memuat notifikasi");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get("/notifications/unread-count");
      if (response.data.success) {
        setUnreadCount(response.data.data.unread_count || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Gagal menandai notifikasi");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Semua notifikasi telah ditandai dibaca");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Gagal menandai semua notifikasi");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      const deleted = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (deleted && !deleted.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success("Notifikasi dihapus");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Gagal menghapus notifikasi");
    }
  };

  const handleClearAll = async () => {
    try {
      setClearingAll(true);
      await api.delete("/notifications/clear-all");
      setNotifications([]);
      setUnreadCount(0);
      toast.success("Semua notifikasi dihapus");
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Gagal menghapus semua notifikasi");
    } finally {
      setClearingAll(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  const handleRefresh = () => {
    setPage(1);
    fetchNotifications(1, false);
    fetchUnreadCount();
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Notifikasi</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Header with actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Notifikasi</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} belum dibaca</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllRead}
                >
                  {markingAllRead ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4 mr-2" />
                  )}
                  Tandai Semua Dibaca
                </Button>
              )}
              {notifications.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus Semua
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Semua Notifikasi?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Aksi ini tidak dapat dibatalkan. Semua notifikasi akan dihapus secara permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearAll}
                        disabled={clearingAll}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {clearingAll ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Hapus Semua
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BellOff className="h-16 w-16 text-muted-foreground mb-4" />
                <CardTitle className="text-xl mb-2">Tidak Ada Notifikasi</CardTitle>
                <CardDescription>
                  Anda belum memiliki notifikasi. Notifikasi akan muncul di sini saat ada aktivitas baru.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md ${
                    !notification.is_read ? "border-l-4 border-l-primary bg-muted/30" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${!notification.is_read ? "text-primary" : ""}`}>
                            {notification.title}
                          </h3>
                          <Badge variant={getNotificationBadgeVariant(notification.type)} className="text-xs">
                            {notification.type.replace(/_/g, " ")}
                          </Badge>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: id,
                            })}
                          </span>
                          <div className="flex gap-2">
                            {notification.action_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                onClick={() => {
                                  if (!notification.is_read) {
                                    handleMarkAsRead(notification.id);
                                  }
                                }}
                              >
                                <Link to={notification.action_url}>Lihat Detail</Link>
                              </Button>
                            )}
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Muat Lebih Banyak
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
