import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  Zap,
  List,
  TrendingUp,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CheckSquare,
} from "lucide-react";

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  event: {
    id: number;
    title: string;
  };
}

interface TaskCounts {
  total: number;
  urgent: number;
  todo: number;
  inProgress: number;
  review: number;
  completed: number;
  overdue: number;
}

export function NavTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchUserTasks();
    }
  }, [user]);

  const fetchUserTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get("/tasks/my-tasks");
      if (response.data.success) {
        setTasks(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateCounts = (): TaskCounts => {
    const now = new Date();
    const counts: TaskCounts = {
      total: tasks.length,
      urgent: 0,
      todo: 0,
      inProgress: 0,
      review: 0,
      completed: 0,
      overdue: 0,
    };

    tasks.forEach((task) => {
      // Urgent = priority high
      if (task.priority === "high") {
        counts.urgent++;
      }

      // Status counts
      if (task.status === "todo") {
        counts.todo++;
      } else if (task.status === "in-progress") {
        counts.inProgress++;
      } else if (task.status === "review") {
        counts.review++;
      } else if (task.status === "done") {
        counts.completed++;
      }

      // Overdue = due_date < today dan status bukan done
      if (
        task.due_date &&
        task.status !== "done" &&
        new Date(task.due_date) < now
      ) {
        counts.overdue++;
      }
    });

    return counts;
  };

  const counts = calculateCounts();

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Tasks Management</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Tasks Management</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <CheckSquare className="h-4 w-4" />
                <span>My Tasks</span>
                {counts.total > 0 && (
                  <SidebarMenuBadge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 ml-auto">
                    {counts.total}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuButton>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction
                  className="bg-sidebar-accent text-sidebar-accent-foreground left-2 data-[state=open]:rotate-90"
                  showOnHover
                >
                  <ChevronRight />
                </SidebarMenuAction>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/tasks/urgent">
                        <Zap className="h-4 w-4" />
                        <span>Urgent</span>
                        {counts.urgent > 0 && (
                          <SidebarMenuBadge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                            {counts.urgent}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/tasks/todo">
                        <List className="h-4 w-4" />
                        <span>To Do</span>
                        {counts.todo > 0 && (
                          <SidebarMenuBadge>
                            {counts.todo}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/tasks/in-progress">
                        <TrendingUp className="h-4 w-4" />
                        <span>In Progress</span>
                        {counts.inProgress > 0 && (
                          <SidebarMenuBadge>
                            {counts.inProgress}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/tasks/review">
                        <Eye className="h-4 w-4" />
                        <span>Review</span>
                        {counts.review > 0 && (
                          <SidebarMenuBadge>
                            {counts.review}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/tasks/completed">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Completed</span>
                        {counts.completed > 0 && (
                          <SidebarMenuBadge>
                            {counts.completed}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/tasks/overdue">
                        <AlertCircle className="h-4 w-4" />
                        <span>Overdue</span>
                        {counts.overdue > 0 && (
                          <SidebarMenuBadge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                            {counts.overdue}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
