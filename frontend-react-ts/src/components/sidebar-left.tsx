import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import {
  QrCode,
  AudioWaveform,
  CalendarDays,
  Command,
  // Home,
  Bell,
  LayoutDashboard,
  Settings2,
  Ticket,
  FileText,
  // Box,
  // Banknote,
  // ClipboardCheck,
  Users,
  // PlusCircle,
  // History,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavWorkspaces } from "@/components/nav-workspaces";
import { NavTasks } from "@/components/nav-tasks";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  teams: [
    {
      name: "HIMA-IF",
      logo: Command,
      plan: "Student Org",
    },
    {
      name: "Panitia Dies Natalis",
      logo: AudioWaveform,
      plan: "Event Committee",
    },
  ],

  navMain: [
    {
      title: "Scan Absensi",
      url: "/scan-qr",
      icon: QrCode,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Tiket Saya",
      url: "/my-tickets",
      icon: Ticket,
    },
    {
      title: "Laporan Event",
      url: "/dashboard/event-reports",
      icon: FileText,
    },
    {
      title: "Kalender Acara",
      url: "/calendar",
      icon: CalendarDays,
    },
    {
      title: "Notifikasi",
      url: "/notifications",
      icon: Bell,
      badge: "3",
    },
  ],
  navSecondary: [
    {
      title: "Pengaturan",
      url: "/dashboard/settings",
      icon: Settings2,
    },
    {
      title: "Bantuan",
      url: "/help",
      icon: Users,
    },
  ],

  modules: [
    {
      id: "admin",
      name: "Administrator",
      emoji: "🛡️",
      roles: ["superadmin"], // Hanya superadmin (role_id = 1)
      pages: [
        {
          name: "Aktivitas Terbaru",
          url: "/dashboard/activities",
          emoji: "📊",
        },
        {
          name: "Audit Logs",
          url: "/dashboard/audit-logs",
          emoji: "📜",
        },
        {
          name: "Pengaturan Sistem",
          url: "/dashboard/system-settings",
          emoji: "⚙️",
        },
        {
          name: "Broadcast Pesan",
          url: "/dashboard/broadcasts",
          emoji: "📢",
        },
      ],
    },
    {
      id: "master_data",
      name: "Master Data",
      emoji: "🗂️",
      roles: ["superadmin", "ketua himpunan"],
      pages: [
        {
          name: "Universitas",
          url: "/master/universities",
          emoji: "🏛️",
        },
        {
          name: "Fakultas",
          url: "/master/faculties",
          emoji: "🎓",
        },
        {
          name: "Program Studi",
          url: "/master/study-programs",
          emoji: "📚",
        },
        {
          name: "Mahasiswa",
          url: "/master/students",
          emoji: "👨‍🎓",
        },
        {
          name: "Ormawa",
          url: "/master/organizations",
          emoji: "🏢",
        },
        {
          name: "User",
          url: "/master/users",
          emoji: "👤",
        },
      ],
    },
  ],
};

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user, committeeStatus } = useAuth();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const currentUserRole = user?.role || "guest";
  const isSuperAdmin = user?.id === 1;
  const isStudent = user?.role_id === 8; // Mahasiswa
  
  // Cek apakah mahasiswa adalah panitia aktif
  const isActiveCommittee = isStudent && committeeStatus?.show_admin_dashboard;

  // Fetch unread notification count
  React.useEffect(() => {
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

    if (user) {
      fetchUnreadCount();
      // Refresh setiap 30 detik
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Menu khusus untuk mahasiswa
  const studentNavMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Tiket Saya",
      url: "/my-tickets",
      icon: Ticket,
    },
    {
      title: "Notifikasi",
      url: "/notifications",
      icon: Bell,
      badge: unreadCount,
    },
  ];

  // Menu untuk mahasiswa yang jadi panitia aktif
  const committeeNavMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Scan Absensi",
      url: "/scan-qr",
      icon: QrCode,
    },
    {
      title: "Tiket Saya",
      url: "/my-tickets",
      icon: Ticket,
    },
    {
      title: "Notifikasi",
      url: "/notifications",
      icon: Bell,
      badge: unreadCount,
    },
  ];

  // Module event yang hanya menampilkan event dimana user jadi panitia
  const committeeEventModule = {
    id: "my_committee_events",
    name: "Event Saya (Panitia)",
    emoji: "📋",
    roles: ["mahasiswa"],
    pages: committeeStatus?.active_events?.map((event) => ({
      name: event.event_name,
      url: `/dashboard/event/${event.event_slug}`,
      emoji: "📅",
    })) || [],
  };

  // Jika mahasiswa dan panitia aktif, tampilkan menu panitia
  if (isStudent && isActiveCommittee) {
    return (
      <Sidebar className="border-r-0" {...props}>
        <SidebarHeader>
          <TeamSwitcher teams={data.teams} />
          <NavMain items={committeeNavMain} />
        </SidebarHeader>
        <SidebarContent>
          <NavWorkspaces workspaces={[committeeEventModule]} />
          <NavTasks />
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    );
  }

  // Jika mahasiswa biasa (bukan panitia), tampilkan menu terbatas tanpa modules
  if (isStudent) {
    return (
      <Sidebar className="border-r-0" {...props}>
        <SidebarHeader>
          <TeamSwitcher teams={data.teams} />
          <NavMain items={studentNavMain} />
        </SidebarHeader>
        <SidebarContent>
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    );
  }
  
  // Superadmin bisa akses semua, selain itu filter berdasarkan role
  const filteredWorkspaces = data.modules.filter((module) => {
    if (isSuperAdmin) return true; // Superadmin bisa akses semua module
    return module.roles.includes(currentUserRole);
  });

  // Admin navMain dengan dynamic unread count
  const adminNavMain = [
    {
      title: "Scan Absensi",
      url: "/scan-qr",
      icon: QrCode,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Tiket Saya",
      url: "/my-tickets",
      icon: Ticket,
    },
    {
      title: "Laporan Event",
      url: "/dashboard/event-reports",
      icon: FileText,
    },
    {
      title: "Kalender Acara",
      url: "/calendar",
      icon: CalendarDays,
    },
    {
      title: "Notifikasi",
      url: "/notifications",
      icon: Bell,
      badge: unreadCount,
    },
  ];

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
        <NavMain items={adminNavMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavWorkspaces workspaces={filteredWorkspaces} />
        <NavTasks />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
