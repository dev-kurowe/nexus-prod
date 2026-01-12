import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, User, Plus, Calendar, MapPin, Users, Globe, FileEdit, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import api from "@/services/api";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Event {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  location: string;
  quota: number;
  status: string;
  banner: string;
}

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await api.get("/events");
        setEvents(response.data.data || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);
  
  const handleLogout = () => {
    logout();
    toast.success("Logout berhasil");
    navigate("/");
  };

  const handleDetailClick = (slug: string) => {
    navigate(`/dashboard/event/${slug}`);
  };

  // Get status badge config
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "published":
        return {
          label: "Published",
          icon: Globe,
          className: "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
        };
      case "draft":
        return {
          label: "Draft",
          icon: FileEdit,
          className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200",
        };
      case "completed":
        return {
          label: "Completed",
          icon: CheckCircle,
          className: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
        };
      default:
        return {
          label: status,
          icon: Clock,
          className: "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200",
        };
    }
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Build full avatar URL
  const avatarUrl = user?.avatar || "";

  return (
    <Sidebar
      collapsible="none"
      className="sticky hidden lg:flex top-0 h-svh border-l"
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border h-14 flex items-center justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarUrl} alt={user?.name || "User"} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name || "User"}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email || "user@nexus.com"}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={avatarUrl} alt={user?.name || "User"} />
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                        {user?.name ? getInitials(user.name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.name || "User"}
                      </span>
                      <span className="truncate text-xs">
                        {user?.email || "user@nexus.com"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Saya</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="p-4">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-4">
          {/* <h3 className="font-semibold text-lg">Daftar Event</h3> */}
          <Link to="/dashboard/create">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Buat Event
            </Button>
          </Link>
        </div>

        {/* Event List */}
        <div className="h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-3 pr-2">
            {/* Loading State */}
            {loading && (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </>
            )}

            {/* Empty State */}
            {!loading && events.length === 0 && (
              <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                Belum ada event.
              </div>
            )}

            {/* Event Items */}
            {!loading &&
              events.map((event) => {
                const statusConfig = getStatusConfig(event.status);
                const StatusIcon = statusConfig.icon;
                return (
                <div
                  key={event.id}
                  className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleDetailClick(event.slug)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm line-clamp-1 flex-1 mr-2">
                      {event.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${statusConfig.className}`}
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(event.start_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      <span>Kuota: {event.quota}</span>
                    </div>
                  </div>
                </div>
              )})}
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
}
