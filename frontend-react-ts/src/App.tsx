import { Routes, Route, Navigate } from "react-router-dom";
import Cookies from "js-cookie";
import LoginPage from "@/views/auth/login";
import RegisterPage from "@/views/auth/register";
import HomePage from "@/views/home/index";
import DashboardPage from "@/views/dashboard/page";
import StudentDashboard from "@/views/dashboard/student-dashboard";
import CreateEventPage from "@/views/dashboard/create-event";
import EditEventPage from "@/views/dashboard/edit-event";
import DetailEventPage from "@/views/dashboard/detail-event";
import useIdleTimeout from "@/hooks/useIdleTimeout";
import PublicEventDetail from "@/views/public/event-detail";
import MyTicketsPage from "@/views/dashboard/my-tickets";
import ScanQrPage from "@/views/dashboard/scan-qr";
import SettingsPage from "@/views/dashboard/settings/page";
import InventoryPage from "@/views/inventory/index";
import LoanApprovalsPage from "@/views/inventory/loan-approvals";
import MyTasksPage from "@/views/tasks/my-tasks";
import EventReportsPage from "@/views/dashboard/event-reports";
import EventReportDetailPage from "@/views/dashboard/event-report-detail";
import EventPerformancePage from "@/views/dashboard/event-performance";
import CalendarPage from "@/views/dashboard/calendar";
import UniversitiesPage from "@/views/master/universities";
import FacultiesPage from "@/views/master/faculties";
import StudyProgramsPage from "@/views/master/study-programs";
import StudentsPage from "@/views/master/students";
import OrganizationsPage from "@/views/master/organizations";
import UsersPage from "@/views/master/users";
import NotificationsPage from "@/views/dashboard/notifications";
import AdminActivitiesPage from "@/views/dashboard/admin-activities";
import AuditLogsPage from "@/views/dashboard/audit-logs";
import SystemSettingsPage from "@/views/dashboard/system-settings";
import BroadcastsPage from "@/views/dashboard/broadcasts";
import { useAuth } from "@/contexts/AuthContext";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = Cookies.get("token");
  return token ? children : <Navigate to="/login" replace />;
}

// Dashboard router berdasarkan role
function DashboardRouter() {
  const { user, committeeStatus, isLoading } = useAuth();
  
  // Tampilkan loading saat auth belum selesai
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Jika mahasiswa (role_id = 8)
  if (user?.role_id === 8) {
    console.log("🎓 User is mahasiswa, committeeStatus:", committeeStatus);
    // Cek apakah mahasiswa adalah panitia aktif
    // Jika ya, tampilkan dashboard admin
    if (committeeStatus?.show_admin_dashboard) {
      console.log("✅ Showing admin dashboard for mahasiswa panitia");
      return <DashboardPage />;
    }
    console.log("📚 Showing student dashboard");
    // Jika tidak ada event aktif sebagai panitia, tampilkan student dashboard
    return <StudentDashboard />;
  }
  
  // Selain mahasiswa, ke dashboard biasa
  return <DashboardPage />;
}

export default function App() {
  useIdleTimeout();
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/events" element={<HomePage />} />

      <Route path="/event/:slug" element={<PublicEventDetail />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardRouter />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/create"
        element={
          <PrivateRoute>
            <CreateEventPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/event/:slug"
        element={
          <PrivateRoute>
            <DetailEventPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/event/:slug/edit"
        element={
          <PrivateRoute>
            <EditEventPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/my-tickets"
        element={
          <PrivateRoute>
            <MyTicketsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/scan-qr"
        element={
          <PrivateRoute>
            <ScanQrPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/calendar"
        element={
          <PrivateRoute>
            <CalendarPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/settings"
        element={
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/logistics/inventory"
        element={
          <PrivateRoute>
            <InventoryPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/logistics/loans"
        element={
          <PrivateRoute>
            <LoanApprovalsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/tasks/:status"
        element={
          <PrivateRoute>
            <MyTasksPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/event-reports"
        element={
          <PrivateRoute>
            <EventReportsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/event/:slug/report"
        element={
          <PrivateRoute>
            <EventReportDetailPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/event/:slug/performance"
        element={
          <PrivateRoute>
            <EventPerformancePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/master/universities"
        element={
          <PrivateRoute>
            <UniversitiesPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/master/faculties"
        element={
          <PrivateRoute>
            <FacultiesPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/master/study-programs"
        element={
          <PrivateRoute>
            <StudyProgramsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/master/students"
        element={
          <PrivateRoute>
            <StudentsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/master/organizations"
        element={
          <PrivateRoute>
            <OrganizationsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/master/users"
        element={
          <PrivateRoute>
            <UsersPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <NotificationsPage />
          </PrivateRoute>
        }
      />

      {/* Admin Routes (Superadmin Only) */}
      <Route
        path="/dashboard/activities"
        element={
          <PrivateRoute>
            <AdminActivitiesPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/audit-logs"
        element={
          <PrivateRoute>
            <AuditLogsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/system-settings"
        element={
          <PrivateRoute>
            <SystemSettingsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/broadcasts"
        element={
          <PrivateRoute>
            <BroadcastsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/inventory"
        element={
          <PrivateRoute>
            <InventoryPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/loans"
        element={
          <PrivateRoute>
            <LoanApprovalsPage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
