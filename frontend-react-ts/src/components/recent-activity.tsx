import { useEffect, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Calendar, 
  CheckCircle2, 
  FileUp, 
  MessageSquare, 
  UserPlus, 
  ClipboardCheck,
  Globe,
  ListTodo,
  UserCheck,
  CreditCard,
  Award,
  Download
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ActivityItem {
  id: number;
  user: {
    id: number;
    name: string;
  };
  activity_type: string;
  entity_type: string;
  description: string;
  created_at: string;
}

// Konfigurasi visual untuk setiap tipe aktivitas
const activityConfig: Record<string, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  label: string;
  category: "panitia" | "peserta" | "both";
}> = {
  event_created: { 
    icon: Calendar, 
    color: "text-blue-600", 
    bgColor: "bg-blue-100",
    label: "Event",
    category: "panitia"
  },
  event_published: { 
    icon: Globe, 
    color: "text-green-600", 
    bgColor: "bg-green-100",
    label: "Publish",
    category: "panitia"
  },
  event_completed: { 
    icon: CheckCircle2, 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-100",
    label: "Selesai",
    category: "panitia"
  },
  task_completed: { 
    icon: ListTodo, 
    color: "text-purple-600", 
    bgColor: "bg-purple-100",
    label: "Task",
    category: "panitia"
  },
  task_assigned: { 
    icon: UserPlus, 
    color: "text-indigo-600", 
    bgColor: "bg-indigo-100",
    label: "Assign",
    category: "panitia"
  },
  file_uploaded: { 
    icon: FileUp, 
    color: "text-orange-600", 
    bgColor: "bg-orange-100",
    label: "Upload",
    category: "panitia"
  },
  comment_added: { 
    icon: MessageSquare, 
    color: "text-cyan-600", 
    bgColor: "bg-cyan-100",
    label: "Komentar",
    category: "panitia"
  },
  check_in: { 
    icon: ClipboardCheck, 
    color: "text-teal-600", 
    bgColor: "bg-teal-100",
    label: "Check-in",
    category: "both"
  },
  attendance_updated: { 
    icon: CheckCircle2, 
    color: "text-green-600", 
    bgColor: "bg-green-100",
    label: "Absensi",
    category: "both"
  },
  registered: { 
    icon: UserCheck, 
    color: "text-blue-600", 
    bgColor: "bg-blue-100",
    label: "Daftar",
    category: "peserta"
  },
  payment_completed: { 
    icon: CreditCard, 
    color: "text-green-600", 
    bgColor: "bg-green-100",
    label: "Bayar",
    category: "peserta"
  },
  certificate_downloaded: { 
    icon: Download, 
    color: "text-amber-600", 
    bgColor: "bg-amber-100",
    label: "Sertifikat",
    category: "peserta"
  },
};

const defaultConfig = { 
  icon: Activity, 
  color: "text-gray-600", 
  bgColor: "bg-gray-100",
  label: "Aktivitas",
  category: "both" as const
};

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, committeeStatus } = useAuth();

  // Tentukan apakah user adalah panitia aktif
  const isActiveCommittee = committeeStatus?.is_committee && (committeeStatus?.active_event_count ?? 0) > 0;

  const fetchActivities = async () => {
    try {
      const response = await api.get("/activities/recent?limit=5");
      if (response.data.success) {
        setActivities(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // Polling setiap 30 detik untuk real-time update
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} detik yang lalu`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} menit yang lalu`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} jam yang lalu`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} hari yang lalu`;
    }
  };

  const getActivityConfig = (activityType: string) => {
    return activityConfig[activityType] || defaultConfig;
  };

  // Cek apakah aktivitas ini milik user sendiri
  const isOwnActivity = (activity: ActivityItem) => {
    return activity.user.id === user?.id;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
          </div>
          {isActiveCommittee && (
            <Badge variant="secondary" className="text-xs">
              Panitia
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Belum ada aktivitas terbaru
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isActiveCommittee 
                ? "Aktivitas event yang Anda kelola akan muncul di sini"
                : "Aktivitas event yang Anda ikuti akan muncul di sini"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const config = getActivityConfig(activity.activity_type);
              const IconComponent = config.icon;
              const isOwn = isOwnActivity(activity);
              
              return (
                <div 
                  key={activity.id} 
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                    isOwn ? "bg-muted/50" : "hover:bg-muted/30"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-foreground leading-snug">
                        <span className={`font-semibold ${isOwn ? "text-primary" : ""}`}>
                          {isOwn ? "Anda" : activity.user.name}
                        </span>{" "}
                        {activity.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1.5 py-0 ${config.color} border-current/30`}
                      >
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
