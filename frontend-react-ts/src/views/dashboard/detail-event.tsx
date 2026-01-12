import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useAuth } from "@/contexts/AuthContext";
import api from "../../services/api"; 
import { formatRupiah } from "@/lib/currency";
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
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  MapPin,
  Users,
  Trash2,
  Plus,
  Type,
  List,
  FileText,
  CheckSquare,
  Trash,
  Eye, 
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Edit,
  Wallet,
  Receipt,
  Coins,
  Package,
} from "lucide-react";
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
import { DatePickerInput } from "@/components/ui/date-picker-input";

interface FormField {
  id: number;
  label: string;
  field_type: "text" | "number" | "select" | "file" | "date";
  options: any;
  is_required: boolean;
  parent_field_id?: number | null;  // ID field parent jika ini adalah conditional field
  conditional_value?: string | null; // Nilai yang harus dipenuhi dari parent field
}

interface Participant {
  id: number;
  user_id: number;
  status: string;
  qr_code: string;
  attendance?: boolean;
  attendance_type?: string; // "offline" atau "online" - cara peserta hadir (untuk event hybrid)
  attendance_proof_url?: string;
  certificate_url?: string;
  email_sent?: boolean;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  answers: {
    id: number;
    value: string;
    form_field: {
      label: string;
    };
  }[];
}

export default function DetailEventPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State Data Event
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State Form Builder
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [newField, setNewField] = useState({
    label: "",
    field_type: "text",
    options: "",
    is_required: false,
    parent_field_id: null as number | null,
    conditional_value: "",
    is_conditional: false,
  });
  const [loadingField, setLoadingField] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  
  // State untuk select peserta untuk kirim sertifikat
  const [selectedCertParticipants, setSelectedCertParticipants] = useState<number[]>([]);
  const [sendingEmails, setSendingEmails] = useState(false);
  
  // State untuk konfirmasi attendance
  const [attendanceConfirm, setAttendanceConfirm] = useState<{
    open: boolean;
    participantId: number | null;
    participantName: string;
    currentAttendance: boolean;
    newAttendance: boolean;
  }>({
    open: false,
    participantId: null,
    participantName: "",
    currentAttendance: false,
    newAttendance: false,
  });
  
  // State Committee
  const [committeeMembers, setCommitteeMembers] = useState<any[]>([]);
  const [loadingCommittee, setLoadingCommittee] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMember, setNewMember] = useState({
    email: "",
    role: "", // Divisi/Jabatan (gabungan)
  });
  const [emailSuggestions, setEmailSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showAddLepasDialog, setShowAddLepasDialog] = useState(false);
  const [isLepasMember, setIsLepasMember] = useState(false); // Flag untuk membedakan panitia biasa vs lepas

  // State Tasks
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showTaskDetailDialog, setShowTaskDetailDialog] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [updatingComments, setUpdatingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    assigned_to_id: null as number | null,
    due_date: "",
  });
  const [editTask, setEditTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    assigned_to_id: null as number | null,
    due_date: "",
  });

  // State Budgets
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [showAddBudgetDialog, setShowAddBudgetDialog] = useState(false);
  const [showEditBudgetDialog, setShowEditBudgetDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [newBudget, setNewBudget] = useState({
    division: "",
    item_name: "",
    quantity: 1,
    plan_amount: "",
  });
  const [editBudgetForm, setEditBudgetForm] = useState({
    division: "",
    item_name: "",
    quantity: 1,
    plan_amount: "",
    real_amount: "",
  });
  const [editBudgetProof, setEditBudgetProof] = useState<File | null>(null);

  // State Loans
  const [loans, setLoans] = useState<any[]>([]);
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [showRequestLoanDialog, setShowRequestLoanDialog] = useState(false);
  const [loanItems, setLoanItems] = useState<Array<{ item_name: string; quantity: number; supplier: string; description: string }>>([]);
  const [loanForm, setLoanForm] = useState({
    loan_date: "",
    return_date: "",
    notes: "",
  });

  // State untuk pending certificate upload
  const [pendingCertificateFiles, setPendingCertificateFiles] = useState<FileList | null>(null);
  const [certificateInputRef, setCertificateInputRef] = useState<HTMLInputElement | null>(null);

  // State untuk generic confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
    variant: "default",
  });

  // Helper untuk buka confirm dialog
  const showConfirmDialog = (
    title: string,
    description: string,
    onConfirm: () => void,
    variant: "default" | "destructive" = "default"
  ) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      onConfirm,
      variant,
    });
  };

  // Helper function: Cek apakah user adalah superadmin (ID 1)
  const isSuperAdmin = () => {
    return user?.id === 1;
  };

  // Helper function: Cek apakah event bisa di-edit (bukan "done" ATAU user adalah superadmin)
  const canEditEvent = () => {
    return event?.status !== "done" || isSuperAdmin();
  };

  // Helper function: Cek apakah event sudah selesai (readonly mode kecuali superadmin)
  const isReadOnlyMode = () => {
    return event?.status === "done" && !isSuperAdmin();
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await api.get(`/events/slug/${slug}`);
        const eventData = response.data.data;
        setEvent(eventData);

        if (eventData.id) {
          fetchFormSchema(eventData.id);
          fetchParticipants(eventData.id);
          fetchCommitteeMembers(eventData.id);
          fetchTasks(eventData.id);
          fetchBudgets(eventData.id);
          fetchEventLoan(eventData.id);
        }
      } catch (error) {
        console.error("Gagal ambil detail:", error);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug, navigate]);


  const fetchFormSchema = async (eventId: number) => {
    try {
      const res = await api.get(`/forms/event/${eventId}`);
      setFormFields(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchParticipants = async (eventId: number) => {
    try {
      const res = await api.get(`/participants/event/${eventId}`);
      // Pastikan selalu set array, bahkan jika response.data.data null/undefined
      const participantsData = res.data?.data || [];
      console.log("fetchParticipants: Received participants:", participantsData.map((p: any) => ({ 
        id: p.id, 
        attendance: p.attendance, 
        status: p.status,
        name: p.user?.name 
      })));
      // Force state update dengan spread operator untuk trigger re-render
      setParticipants([...participantsData]);
    } catch (err) {
      console.error("Gagal load peserta:", err);
      // Set empty array jika error terjadi
      setParticipants([]);
    }
  };

  const fetchCommitteeMembers = async (eventId: number) => {
    try {
      setLoadingCommittee(true);
      const res = await api.get(`/committees/event/${eventId}`);
      setCommitteeMembers(res.data?.data || []);
    } catch (err) {
      console.error("Gagal load panitia:", err);
      setCommitteeMembers([]);
    } finally {
      setLoadingCommittee(false);
    }
  };

  const fetchBudgets = async (eventId: number) => {
    try {
      setLoadingBudgets(true);
      const res = await api.get(`/budgets/event/${eventId}`);
      setBudgets(res.data?.data || []);
    } catch (err) {
      console.error("Gagal load anggaran:", err);
      setBudgets([]);
    } finally {
      setLoadingBudgets(false);
    }
  };

  const fetchEventLoan = async (eventId: number) => {
    try {
      setLoadingLoan(true);
      console.log("Fetching loans for event ID:", eventId); // Debug log
      const res = await api.get(`/loans/event/${eventId}`);
      console.log("Loan API response:", res.data); // Debug log
      if (res.data.success) {
        const loansData = res.data.data || [];
        console.log("Loans data:", loansData, "Count:", loansData.length); // Debug log
        setLoans(loansData);
      } else {
        console.error("Failed to fetch loans:", res.data.message);
        setLoans([]);
      }
    } catch (err: any) {
      console.error("Error fetching loans:", err);
      console.error("Error response:", err.response?.data); // Debug log
      // Jika 404, berarti belum ada loan (itu normal)
      if (err.response?.status === 404) {
        console.log("No loans found (404) - this is normal if no loans exist");
        setLoans([]);
      } else {
        setLoans([]);
      }
    } finally {
      setLoadingLoan(false);
    }
  };


  const handleRequestLoan = async () => {
    if (!loanForm.loan_date || !loanForm.return_date) {
      toast.error("Tanggal pinjam dan kembali wajib diisi!");
      return;
    }
    if (loanItems.length === 0) {
      toast.error("Minimal tambahkan 1 barang!");
      return;
    }
    // Validasi semua item harus punya nama
    for (const item of loanItems) {
      if (!item.item_name.trim()) {
        toast.error("Nama barang wajib diisi untuk semua item!");
        return;
      }
      if (item.quantity <= 0) {
        toast.error("Jumlah barang harus lebih dari 0!");
        return;
      }
    }

    try {
      setLoadingLoan(true);
      console.log("Creating loan for event ID:", event.id); // Debug log
      console.log("Loan items:", loanItems); // Debug log
      const response = await api.post(`/loans/event/${event.id}`, {
        items: loanItems,
        loan_date: loanForm.loan_date,
        return_date: loanForm.return_date,
        notes: loanForm.notes,
      });
      
      console.log("Create loan response:", response.data); // Debug log
      
      if (response.data.success) {
        toast.success("Request peminjaman berhasil dibuat!");
        setShowRequestLoanDialog(false);
        setLoanForm({ loan_date: "", return_date: "", notes: "" });
        setLoanItems([]);
        // Refresh data loan dengan delay kecil untuk memastikan data sudah tersimpan
        setTimeout(() => {
          console.log("Refreshing loans for event ID:", event.id); // Debug log
          fetchEventLoan(event.id);
        }, 500);
      } else {
        toast.error(response.data.message || "Gagal membuat request peminjaman");
      }
    } catch (error: any) {
      console.error("Error creating loan:", error);
      console.error("Error response:", error.response?.data); // Debug log
      toast.error(error.response?.data?.message || "Gagal membuat request peminjaman");
    } finally {
      setLoadingLoan(false);
    }
  };

  const addLoanItem = () => {
    setLoanItems([...loanItems, { item_name: "", quantity: 1, supplier: "", description: "" }]);
  };

  const removeLoanItem = (index: number) => {
    setLoanItems(loanItems.filter((_, i) => i !== index));
  };

  const updateLoanItem = (index: number, field: string, value: any) => {
    const updated = [...loanItems];
    updated[index] = { ...updated[index], [field]: value };
    setLoanItems(updated);
  };

  const handleAddCommitteeMember = async () => {
    if (!newMember.email.trim() || !newMember.role.trim()) {
      toast.error("Email dan Divisi/Jabatan wajib diisi!");
      return;
    }

    setLoadingCommittee(true);
    try {
      await api.post(`/committees/event/${event.id}`, {
        email: newMember.email.trim(),
        role: newMember.role.trim(),
      });
      
      toast.success("Panitia berhasil ditambahkan!");
      setShowAddMemberDialog(false);
      setNewMember({ email: "", role: "" });
      setEmailSuggestions([]);
      setShowSuggestions(false);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      fetchCommitteeMembers(event.id);
    } catch (error: any) {
      console.error("Gagal menambah panitia:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Gagal menambah panitia. Silakan coba lagi.");
      }
    } finally {
      setLoadingCommittee(false);
    }
  };

  const handleRemoveCommitteeMember = async (memberId: number) => {
    showConfirmDialog(
      "Hapus Panitia",
      "Yakin ingin menghapus panitia ini?",
      async () => {
        try {
          await api.delete(`/committees/${memberId}`);
          toast.success("Panitia berhasil dihapus!");
          fetchCommitteeMembers(event.id);
        } catch (error: any) {
          console.error("Gagal menghapus panitia:", error);
          toast.error(error.response?.data?.message || "Gagal menghapus panitia. Silakan coba lagi.");
        }
      },
      "destructive"
    );
  };

  // Search users untuk autocomplete email
  // roleFilter: "1-7" untuk panitia biasa (role 1-7), "8" untuk panitia lepas (role 8)
  const searchUsers = async (query: string, roleFilter: string = "1-7") => {
    if (!query || query.length < 2) {
      setEmailSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchingUsers(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(query)}&limit=10&role_ids=${roleFilter}`);
      setEmailSuggestions(res.data?.data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Gagal mencari user:", error);
      setEmailSuggestions([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Debounce function untuk search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const handleEmailInputChange = (value: string, isLepas: boolean = false) => {
    setNewMember({ ...newMember, email: value });
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout untuk debounce
    // Filter: role 1-7 untuk panitia biasa, role 8 untuk panitia lepas
    const roleFilter = isLepas ? "8" : "1-7";
    const timeout = setTimeout(() => {
      searchUsers(value, roleFilter);
    }, 300); // Wait 300ms setelah user stop typing
    
    setSearchTimeout(timeout);
  };

  const selectEmail = (email: string) => {
    setNewMember({ ...newMember, email });
    setShowSuggestions(false);
    setEmailSuggestions([]);
  };

  // Task Management Functions
  const fetchTasks = async (eventId: number) => {
    try {
      setLoadingTasks(true);
      const res = await api.get(`/tasks/event/${eventId}`);
      const rawTasks = res.data?.data || [];
      const parsedTasks = rawTasks.map((t: any) => {
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
      setTasks(parsedTasks);
    } catch (err) {
      console.error("Gagal load tugas:", err);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Judul tugas wajib diisi!");
      return;
    }

    setLoadingTasks(true);
    try {
      const dueDate = newTask.due_date ? new Date(newTask.due_date).toISOString() : null;
      const res = await api.post(`/tasks/event/${event.id}`, {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        assigned_to_id: newTask.assigned_to_id || null,
        due_date: dueDate,
      });
      
      toast.success("Tugas berhasil ditambahkan!");
      setShowAddTaskDialog(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assigned_to_id: null,
        due_date: "",
      });
      await fetchTasks(event.id);
      // Jika baru dibuat, set selectedTask untuk melihat detail (opsional)
      if (res?.data?.data) {
        const created = res.data.data;
        let parsedComments: any[] = [];
        if (created.comments) {
          try {
            parsedComments = JSON.parse(created.comments);
          } catch (e) {
            parsedComments = [];
          }
        }
        setSelectedTask({ ...created, parsedComments });
      }
    } catch (error: any) {
      console.error("Gagal menambah tugas:", error);
      toast.error(error.response?.data?.message || "Gagal menambah tugas. Silakan coba lagi.");
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await api.put(`/tasks/${taskId}`, {
        status: newStatus,
      });
      // Refresh tasks
      fetchTasks(event.id);
    } catch (error: any) {
      console.error("Gagal mengupdate status tugas:", error);
      toast.error(error.response?.data?.message || "Gagal mengupdate status tugas.");
      // Revert: refresh tasks
      fetchTasks(event.id);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    showConfirmDialog(
      "Hapus Tugas",
      "Yakin ingin menghapus tugas ini?",
      async () => {
        try {
          await api.delete(`/tasks/${taskId}`);
          toast.success("Tugas berhasil dihapus!");
          fetchTasks(event.id);
        } catch (error: any) {
          console.error("Gagal menghapus tugas:", error);
          toast.error(error.response?.data?.message || "Gagal menghapus tugas. Silakan coba lagi.");
        }
      },
      "destructive"
    );
  };

  // Upload bukti pengerjaan (hanya user yang ditugaskan)
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
      fetchTasks(event.id);
      // Update selected task jika sedang dibuka
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(response.data?.data || selectedTask);
      }
    } catch (error: any) {
      console.error("Gagal upload bukti:", error);
      toast.error(error.response?.data?.message || "Gagal upload bukti pengerjaan. Silakan coba lagi.");
    } finally {
      setUploadingProof(false);
    }
  };

  // Update komentar (hanya user yang ditugaskan atau admin)
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
      await fetchTasks(event.id);
      // Update selected task jika sedang dibuka
      if (selectedTask && selectedTask.id === taskId) {
        // Parse comments ke parsedComments
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

  // Edit task (hanya Super Admin dan Ketua Himpunan)
  const handleEditTask = async () => {
    if (!editTask.title.trim()) {
      toast.error("Judul tugas wajib diisi!");
      return;
    }

    setLoadingTasks(true);
    try {
      const dueDate = editTask.due_date ? new Date(editTask.due_date).toISOString() : null;
      const response = await api.put(`/tasks/${selectedTask?.id}`, {
        title: editTask.title.trim(),
        description: editTask.description.trim(),
        priority: editTask.priority,
        status: editTask.status,
        assigned_to_id: editTask.assigned_to_id || null,
        due_date: dueDate,
      });

      toast.success("Tugas berhasil diupdate!");
      setShowEditTaskDialog(false);
      fetchTasks(event.id);
      // Update selected task
      if (selectedTask) {
        setSelectedTask(response.data?.data || selectedTask);
      }
    } catch (error: any) {
      console.error("Gagal update tugas:", error);
      toast.error(error.response?.data?.message || "Gagal update tugas. Silakan coba lagi.");
    } finally {
      setLoadingTasks(false);
    }
  };

  // Check permission: bisa edit task (creator, panitia, atau super admin)
  const canEditTask = (task?: any) => {
    if (!user) return false;
    
    // Super Admin atau Ketua Himpunan selalu bisa edit
    if (user?.role === "superadmin" || user?.role === "kahim") return true;
    
    // Jika task diberikan, cek apakah user adalah creator atau panitia
    if (task) {
      // Cek apakah user adalah creator task
      const isCreator = task.created_by_id === user?.id;
      
      // Cek apakah user adalah panitia dari event ini
      const isCommittee = committeeMembers.some((m) => m.user?.id === user?.id);
      
      return isCreator || isCommittee;
    }
    
    // Default: cek apakah user adalah panitia
    return committeeMembers.some((m) => m.user?.id === user?.id);
  };

  // Check permission: bisa ubah status task
  // Yang bisa ubah status: creator, panitia, atau super admin
  // Yang TIDAK bisa ubah status: assignee (hanya bisa upload proof)
  const canChangeTaskStatus = (task: any) => {
    if (!user || !task) return false;
    
    // Super Admin atau Ketua Himpunan selalu bisa ubah status
    if (user?.role === "superadmin" || user?.role === "kahim") return true;
    
    // Cek apakah user adalah creator task
    const isCreator = task.created_by_id === user?.id;
    
    // Cek apakah user adalah panitia dari event ini
    const isCommittee = committeeMembers.some((m) => m.user?.id === user?.id);
    
    // Cek apakah user adalah assignee (yang diberi tugas)
    const isAssignee = task.assigned_to_id && task.assigned_to_id === user?.id;
    
    // Assignee TIDAK BISA ubah status (hanya bisa upload proof)
    if (isAssignee && !isCreator && !isCommittee) {
      return false;
    }
    
    // Yang bisa ubah status: creator atau panitia
    return isCreator || isCommittee;
  };

  // Check permission: hanya user yang ditugaskan yang bisa upload bukti
  const canUploadProof = (task: any) => {
    return task.assigned_to_id && user?.id === task.assigned_to_id;
  };

  // Check permission: yang bisa melihat bukti adalah user ditugaskan atau admin
  const canViewProof = (task: any) => {
    return canUploadProof(task) || canEditTask(task);
  };

  // Budget permissions
  // Check permission: hanya Super Admin (role_id 1) atau Bendahara Umum (role_id 3)
  const canManageBudget = () => {
    if (user?.role_id === 1 || user?.role_id === 3) return true;
    const roleStr = user?.role?.toLowerCase() || "";
    return roleStr === "superadmin" || roleStr === "bendahara umum" || roleStr === "bendahara_umum";
  };

  const canManageAttendance = () => {
    if (!user) {
      console.log("canManageAttendance: user is null");
      return false;
    }
    
    // Super Admin selalu bisa manage attendance (prioritas pertama)
    if (isSuperAdmin()) {
      console.log("canManageAttendance: User is Super Admin - ALLOWED");
      return true;
    }
    
    // Cek apakah user adalah panitia dari event ini
    const isCommittee = committeeMembers.some((m) => m.user?.id === user?.id);
    console.log("canManageAttendance: isCommittee =", isCommittee, "committeeMembers =", committeeMembers.map(m => ({ id: m.user?.id, name: m.user?.name })));
    
    if (isCommittee) {
      console.log("canManageAttendance: User is Committee Member - ALLOWED");
      return true;
    }
    
    console.log("canManageAttendance: User is NOT allowed");
    return false;
  };

  const isBudgetDivisionMember = (division: string) => {
    if (!division || !user) return false;
    const normalized = (division || "").trim().toLowerCase();
    return committeeMembers.some((m) => {
      const div = (m.position || (m.division && m.division !== "-" ? m.division : "") || "")
        .trim()
        .toLowerCase();
      return m.user?.id === user.id && div === normalized;
    });
  };

  const hasFullBudgetAccess = () => canManageBudget();

  const canOpenBudgetEdit = (budget: any) => {
    if (!budget) return false;
    if (hasFullBudgetAccess()) return true;
    return isBudgetDivisionMember(budget.division);
  };

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    // Jika tidak ada destination atau sama dengan source, tidak ada yang perlu dilakukan
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Cek permission sebelum drag
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      toast.error("Tugas tidak ditemukan");
      return;
    }
    
    if (!canChangeTaskStatus(task)) {
      toast.warning("Anda tidak memiliki izin untuk mengubah status tugas ini. Hanya yang memberi tugas atau panitia yang dapat mengubah status. Anda hanya bisa mengerjakan dan mengirim bukti pengerjaan.");
      // Revert: refresh tasks
      fetchTasks(event.id);
      return;
    }

    // Optimistic update: update state lokal dulu
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasks);

    // Panggil API untuk update status
    handleUpdateTaskStatus(taskId, newStatus);
  };

  // Budget Management Functions
  const handleCreateBudget = async () => {
    if (!newBudget.division.trim() || !newBudget.item_name.trim() || !newBudget.plan_amount) {
      toast.error("Divisi, nama barang, dan rencana biaya wajib diisi!");
      return;
    }

    const quantity = Number(newBudget.quantity);
    const planAmount = Number(newBudget.plan_amount);
    if (Number.isNaN(planAmount)) {
      toast.error("Rencana biaya harus berupa angka.");
      return;
    }

    setLoadingBudgets(true);
    try {
      await api.post(`/budgets/event/${event.id}`, {
        division: newBudget.division.trim(),
        item_name: newBudget.item_name.trim(),
        quantity: quantity || 0,
        plan_amount: planAmount,
      });

      toast.success("Anggaran berhasil ditambahkan!");
      setShowAddBudgetDialog(false);
      setNewBudget({
        division: "",
        item_name: "",
        quantity: 1,
        plan_amount: "",
      });
      fetchBudgets(event.id);
    } catch (error: any) {
      console.error("Gagal menambah anggaran:", error);
      toast.error(error.response?.data?.message || "Gagal menambah anggaran. Silakan coba lagi.");
    } finally {
      setLoadingBudgets(false);
    }
  };

  const handleOpenEditBudget = (budget: any) => {
    if (!canOpenBudgetEdit(budget)) {
      toast.warning("Anda tidak memiliki akses untuk mengedit anggaran ini.");
      return;
    }
    setSelectedBudget(budget);
    setEditBudgetForm({
      division: budget.division || "",
      item_name: budget.item_name || "",
      quantity: budget.quantity || 1,
      plan_amount: budget.plan_amount ? budget.plan_amount.toString() : "",
      real_amount:
        budget.real_amount !== undefined && budget.real_amount !== null
          ? budget.real_amount.toString()
          : "",
    });
    setEditBudgetProof(null);
    setShowEditBudgetDialog(true);
  };

  const handleUpdateBudget = async () => {
    if (!selectedBudget) return;

    const formData = new FormData();
    formData.append("division", editBudgetForm.division.trim());
    formData.append("item_name", editBudgetForm.item_name.trim());
    formData.append("quantity", String(editBudgetForm.quantity || 0));

    if (editBudgetForm.plan_amount !== "") {
      formData.append("plan_amount", editBudgetForm.plan_amount);
    }
    if (editBudgetForm.real_amount !== "") {
      formData.append("real_amount", editBudgetForm.real_amount);
    }
    if (editBudgetProof) {
      formData.append("proof_image", editBudgetProof);
    }

    setLoadingBudgets(true);
    try {
      await api.put(`/budgets/${selectedBudget.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Anggaran berhasil diupdate!");
      setShowEditBudgetDialog(false);
      setSelectedBudget(null);
      setEditBudgetProof(null);
      fetchBudgets(event.id);
    } catch (error: any) {
      console.error("Gagal update anggaran:", error);
      toast.error(error.response?.data?.message || "Gagal update anggaran. Silakan coba lagi.");
    } finally {
      setLoadingBudgets(false);
    }
  };

  const handleDeleteBudget = async (budgetId: number) => {
    showConfirmDialog(
      "Hapus Anggaran",
      "Yakin ingin menghapus item anggaran ini?",
      async () => {
        try {
          await api.delete(`/budgets/${budgetId}`);
          toast.success("Anggaran ditandai rejected!");
          fetchBudgets(event.id);
        } catch (error: any) {
          console.error("Gagal menghapus anggaran:", error);
          toast.error(error.response?.data?.message || "Gagal menghapus anggaran. Silakan coba lagi.");
        }
      },
      "destructive"
    );
  };

  const getBudgetStatusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleAddField = async () => {
    if (!newField.label) {
      toast.error("Label pertanyaan wajib diisi!");
      return;
    }
    
    // Validasi conditional field
    if (newField.is_conditional) {
      if (!newField.parent_field_id) {
        toast.error("Pilih field parent untuk conditional field!");
        return;
      }
      if (!newField.conditional_value) {
        toast.error("Masukkan nilai conditional (misalnya: Ya)!");
        return;
      }
    }
    
    setLoadingField(true);
    try {
      const optionsArray = newField.options
        ? newField.options.split(",").map((s) => s.trim())
        : [];

      await api.post(`/forms/event/${event.id}`, {
        label: newField.label,
        field_type: newField.field_type,
        options: optionsArray,
        is_required: newField.is_required,
        parent_field_id: newField.is_conditional ? newField.parent_field_id : null,
        conditional_value: newField.is_conditional ? newField.conditional_value : "",
      });

      setNewField({
        label: "",
        field_type: "text",
        options: "",
        is_required: false,
        parent_field_id: null,
        conditional_value: "",
        is_conditional: false,
      });
      fetchFormSchema(event.id);
    } catch (err) {
      toast.error("Gagal menambah pertanyaan");
    } finally {
      setLoadingField(false);
    }
  };

  const handleDeleteField = async (id: number) => {
    showConfirmDialog(
      "Hapus Pertanyaan",
      "Yakin ingin menghapus pertanyaan ini?",
      async () => {
        try {
          await api.delete(`/form-fields/${id}`);
          fetchFormSchema(event.id);
        } catch (err) {
          toast.error("Gagal menghapus");
        }
      },
      "destructive"
    );
  };

  const handleDeleteEvent = async () => {
    try {
      await api.delete(`/events/${event.id}`);
      navigate("/dashboard");
    } catch (error) {
      toast.error("Gagal menghapus event");
    }
  };

  const handleExport = async () => {
    try {
      const token = Cookies.get("token");
      const response = await axios.get(
        `http://localhost:8000/api/export/event/${event.id}/participants`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Peserta_Event_${event.title}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Gagal download excel", error);
      toast.error(
        "Gagal mendownload data. Pastikan Anda login sebagai admin/panitia."
      );
    }
  };

  const handleUpdateStatus = async (id: number, status: "confirmed" | "rejected") => {
    const action = status === "confirmed" ? "menerima" : "menolak";
    
    showConfirmDialog(
      status === "confirmed" ? "Terima Pendaftar" : "Tolak Pendaftar",
      `Yakin ingin ${action} pendaftar ini?`,
      async () => {
        try {
          await api.put(`/participants/${id}/status`, { status });
          toast.success(`Status berhasil diupdate menjadi '${status}'`);
          fetchParticipants(event.id);
        } catch (error: any) {
          console.error("Gagal update status:", error);
          toast.error(error.response?.data?.message || "Gagal mengupdate status pendaftaran");
        }
      },
      status === "rejected" ? "destructive" : "default"
    );
  };

  // Fungsi untuk membuka dialog konfirmasi attendance
  const handleAttendanceSwitch = (participantId: number, participantName: string, currentAttendance: boolean, newAttendance: boolean) => {
    // Double check permission sebelum membuka dialog
    if (!canManageAttendance()) {
      toast.warning(`Anda tidak memiliki izin untuk mengubah kehadiran. Hanya panitia atau Super Admin yang bisa.`);
      return;
    }
    
    // Revert Switch ke posisi awal dengan update state sementara
    setParticipants(prevParticipants => 
      prevParticipants.map(p => {
        if (p.id === participantId) {
          return { ...p, attendance: currentAttendance };
        }
        return p;
      })
    );
    
    setAttendanceConfirm({
      open: true,
      participantId,
      participantName,
      currentAttendance,
      newAttendance,
    });
  };

  // Fungsi untuk update attendance setelah konfirmasi
  const handleUpdateAttendance = async () => {
    const { participantId, newAttendance } = attendanceConfirm;
    
    if (!participantId) return;

    // Double check permission sebelum update
    if (!canManageAttendance()) {
      toast.warning(`Anda tidak memiliki izin untuk mengubah kehadiran. Hanya panitia atau Super Admin yang bisa.`);
      // Revert ke nilai sebelumnya jika tidak punya permission
      setParticipants(prevParticipants => 
        prevParticipants.map(p => {
          if (p.id === attendanceConfirm.participantId) {
            return { ...p, attendance: attendanceConfirm.currentAttendance };
          }
          return p;
        })
      );
      setAttendanceConfirm({ open: false, participantId: null, participantName: "", currentAttendance: false, newAttendance: false });
      return;
    }

    try {
      console.log("handleUpdateAttendance: Sending API request...", { id: participantId, attendance: newAttendance });
      const response = await api.put(`/participants/${participantId}/attendance`, { attendance: newAttendance });
      console.log("handleUpdateAttendance: API response:", response.data);
      
      // Update state dari response API (data terbaru dari server)
      if (response.data?.success && response.data?.data) {
        const updatedRegistration = response.data.data;
        console.log("handleUpdateAttendance: Received updated registration from API:", {
          id: updatedRegistration.id,
          attendance: updatedRegistration.attendance,
          status: updatedRegistration.status
        });
        
        // Update state dengan spread operator untuk force re-render
        setParticipants(prevParticipants => {
          const updated = prevParticipants.map(p => {
            if (p.id === participantId) {
              const newParticipant = {
                ...p,
                attendance: updatedRegistration.attendance !== undefined ? updatedRegistration.attendance : newAttendance,
                status: updatedRegistration.status || (newAttendance ? "checked_in" : (p.status === "checked_in" ? "confirmed" : p.status))
              };
              console.log("handleUpdateAttendance: Updated participant state:", {
                old: { attendance: p.attendance, status: p.status },
                new: { attendance: newParticipant.attendance, status: newParticipant.status }
              });
              return newParticipant;
            }
            return p;
          });
          // Force re-render dengan spread operator
          return [...updated];
        });
      } else {
        // Fallback: update optimistically jika response tidak lengkap
        console.log("handleUpdateAttendance: API response tidak lengkap, using optimistic update");
        setParticipants(prevParticipants => {
          const updated = prevParticipants.map(p => {
            if (p.id === participantId) {
              return {
                ...p,
                attendance: newAttendance,
                status: newAttendance ? "checked_in" : (p.status === "checked_in" ? "confirmed" : p.status)
              };
            }
            return p;
          });
          return [...updated];
        });
        
        // Refresh dari server untuk memastikan data sync
        setTimeout(() => {
          fetchParticipants(event.id);
        }, 200);
      }
      
      // Tutup dialog konfirmasi
      setAttendanceConfirm({ open: false, participantId: null, participantName: "", currentAttendance: false, newAttendance: false });
      
    } catch (error: any) {
      console.error("❌ Gagal update attendance:", error);
      console.error("Error response:", error.response?.data);
      
      // Revert ke nilai sebelumnya jika error
      setParticipants(prevParticipants => 
        prevParticipants.map(p => {
          if (p.id === attendanceConfirm.participantId) {
            return { ...p, attendance: attendanceConfirm.currentAttendance };
          }
          return p;
        })
      );
      
      // Refresh dari server untuk memastikan data sync
      fetchParticipants(event.id);
      
      // Tutup dialog konfirmasi
      setAttendanceConfirm({ open: false, participantId: null, participantName: "", currentAttendance: false, newAttendance: false });
      
      toast.error(error.response?.data?.message || "Gagal mengupdate kehadiran. Periksa console untuk detail error.");
    }
  };

  const handleBulkUpdateStatus = async (status: "confirmed" | "rejected") => {
    if (selectedParticipants.length === 0) {
      toast.error("Pilih minimal 1 peserta terlebih dahulu!");
      return;
    }

    const action = status === "confirmed" ? "menerima" : "menolak";
    
    showConfirmDialog(
      status === "confirmed" ? "Terima Pendaftar" : "Tolak Pendaftar",
      `Yakin ingin ${action} ${selectedParticipants.length} pendaftar yang dipilih?`,
      async () => {
        try {
          const response = await api.post("/participants/bulk-update-status", {
            registration_ids: selectedParticipants,
            status: status,
          });
          
          toast.success(response.data.message || `Berhasil mengupdate ${selectedParticipants.length} pendaftar`);
          setSelectedParticipants([]); // Reset selection
          fetchParticipants(event.id);
        } catch (error: any) {
          console.error("Gagal bulk update status:", error);
          toast.error(error.response?.data?.message || "Gagal mengupdate status pendaftaran");
        }
      },
      status === "rejected" ? "destructive" : "default"
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Pilih semua peserta yang statusnya pending
      const pendingIds = (participants || [])
        .filter(p => p.status === "pending")
        .map(p => p.id);
      setSelectedParticipants(pendingIds);
    } else {
      setSelectedParticipants([]);
    }
  };

  const handleSelectParticipant = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedParticipants([...selectedParticipants, id]);
    } else {
      setSelectedParticipants(selectedParticipants.filter(pid => pid !== id));
    }
  };

  // Handle Publish Event
  const handlePublishEvent = async () => {
    if (!event) return;
    
    showConfirmDialog(
      "Publish Event",
      `Yakin ingin publish event "${event.title}"? Event ini akan muncul di halaman public dan bisa didaftarkan oleh peserta.`,
      async () => {
        try {
          const response = await api.put(`/events/${event.id}/publish`);
          if (response.data.success) {
            toast.success("Event berhasil dipublish!");
            // Update status event di state
            setEvent({ ...event, status: "published" });
          }
        } catch (error: any) {
          console.error("Gagal publish event:", error);
          toast.error(error.response?.data?.message || "Gagal publish event.");
        }
      }
    );
  };

  // Handle Complete Event
  const handleCompleteEvent = async () => {
    if (!event) return;
    
    showConfirmDialog(
      "Selesaikan Event",
      `Yakin ingin menandai event "${event.title}" sebagai selesai? Event ini tidak akan muncul lagi di daftar event, tetapi tetap bisa dilihat laporannya.`,
      async () => {
        try {
          const response = await api.put(`/events/${event.id}/complete`);
          if (response.data.success) {
            toast.success("Event berhasil ditandai sebagai selesai!");
            // Update status event di state
            setEvent({ ...event, status: "done" });
          }
        } catch (error: any) {
          console.error("Gagal menandai event selesai:", error);
          toast.error(error.response?.data?.message || "Gagal menandai event selesai.");
        }
      }
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "text":
        return <Type className="w-4 h-4" />;
      case "number":
        return <CheckSquare className="w-4 h-4" />;
      case "select":
        return <List className="w-4 h-4" />;
      case "file":
        return <FileText className="w-4 h-4" />;
      default:
        return <Type className="w-4 h-4" />;
    }
  };

  const activeBudgets = budgets.filter((b) => b.status !== "rejected");
  const totalPlanAmount = activeBudgets.reduce(
    (sum, b) => sum + (Number(b.plan_amount) || 0),
    0
  );
  const totalRealAmount = activeBudgets.reduce(
    (sum, b) => sum + (Number(b.real_amount) || 0),
    0
  );
  const budgetDifference = totalPlanAmount - totalRealAmount;

  const divisionOptions = Array.from(
    new Set(
      committeeMembers
        .map((m) => m.position || (m.division && m.division !== "-" ? m.division : ""))
        .filter(Boolean)
    )
  );

  if (loading)
    return <div className="p-10 text-center">Loading event details...</div>;
  if (!event) return null;

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background border-b px-4 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold">
                  {event.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={
                    event.status === "published" ? "default" 
                    : event.status === "done" ? "secondary"
                    : "outline"
                  }
                >
                  {event.status === "done" ? "SELESAI" : event.status.toUpperCase()}
                </Badge>
                {event.category && (
                  <Badge variant="outline">
                    {event.category}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  ID: {event.id}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {event.title}
              </h1>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/event/${event.slug}`, "_blank")}
              >
                <Eye className="w-4 h-4 mr-2" /> Lihat Public Page
              </Button>

              {/* Tombol Edit - hanya tampil jika bukan status "done" */}
              {event.status !== "done" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dashboard/event/${event.slug}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit Event
                </Button>
              )}

              {event.status === "draft" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Publish Event
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Publish Event?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Event ini akan dipublish dan muncul di halaman public. Peserta akan bisa mendaftar ke event ini setelah dipublish.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePublishEvent}>
                        Ya, Publish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {event.status !== "done" && event.status !== "draft" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Tandai Selesai
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tandai Event sebagai Selesai?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Event ini akan ditandai sebagai selesai dan tidak akan muncul lagi di daftar event. Namun, Anda tetap bisa melihat laporan event ini di halaman "Laporan Event".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCompleteEvent}>
                        Ya, Tandai Selesai
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {event.status === "done" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dashboard/event/${event.slug}/report`)}
                >
                  <FileText className="w-4 h-4 mr-2" /> Lihat Laporan
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" /> Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Event ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini permanen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteEvent}
                      className="bg-red-600"
                    >
                      Ya, Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* TAB UTAMA */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-8 md:w-[1100px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="form-builder">Form Builder</TabsTrigger>
              <TabsTrigger value="participants">
                Pendaftar ({participants?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="certificates">Sertifikat</TabsTrigger>
              <TabsTrigger value="panitia">Panitia</TabsTrigger>
              <TabsTrigger value="anggaran">Anggaran</TabsTrigger>
              <TabsTrigger value="tugas">Tugas</TabsTrigger>
              <TabsTrigger value="logistik">Logistik</TabsTrigger>
            </TabsList>

            {/* KONTEN: OVERVIEW */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 overflow-hidden">
                  <div className="h-64 bg-slate-100 relative">
                    {event.banner ? (
                      <img
                        src={event.banner}
                        alt="Banner"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No Banner
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle>Deskripsi Event</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                      {event.description}
                    </p>
                  </CardContent>
                </Card>
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detail Pelaksanaan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Mulai</p>
                          <p className="font-medium">
                            {new Date(event.start_date).toLocaleDateString(
                              "id-ID"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Lokasi
                          </p>
                          <p className="font-medium">{event.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Kuota</p>
                          <p className="font-medium">{event.quota} Orang</p>
                        </div>
                      </div>
                      {event.price !== undefined && (
                        <div className="flex items-center gap-3">
                          <Coins className={`w-5 h-5 ${event.price === 0 || event.price === null ? "text-green-600" : "text-orange-600"}`} />
                          <div>
                            <p className="text-xs text-muted-foreground">Harga</p>
                            <p className={`font-medium ${event.price === 0 || event.price === null ? "text-green-600" : "text-orange-600"}`}>
                              {event.price === 0 || event.price === null 
                                ? "Gratis" 
                                : formatRupiah(event.price)}
                            </p>
                            {event.price > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Auto-approve setelah pembayaran
                              </p>
                            )}
                            {event.price === 0 && (
                              <p className="text-xs text-muted-foreground">
                                Perlu approval panitia
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* KONTEN: FORM BUILDER */}
            <TabsContent value="form-builder" className="mt-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Preview Form Pendaftaran
                    </h3>
                    <Badge variant="outline">
                      {formFields.length} Pertanyaan
                    </Badge>
                  </div>
                  {formFields.length === 0 && (
                    <div className="border border-dashed p-8 rounded-lg text-center text-muted-foreground bg-muted/20">
                      Belum ada pertanyaan.
                    </div>
                  )}
                  {formFields.map((field) => {
                    const parentField = field.parent_field_id 
                      ? formFields.find(f => f.id === field.parent_field_id)
                      : null;
                    return (
                    <Card
                      key={field.id}
                      className={`group relative hover:border-blue-400 transition-colors ${
                        field.parent_field_id 
                          ? "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                          : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            {field.parent_field_id && parentField && (
                              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">Conditional</Badge>
                                Tampilkan jika "{parentField.label}" dijawab <span className="font-medium">"{field.conditional_value || ""}"</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="px-1.5 h-6">
                                {getIcon(field.field_type)}
                              </Badge>
                              <span className="font-medium">{field.label}</span>
                              {field.is_required && (
                                <span className="text-red-500 text-xs">
                                  *Wajib
                                </span>
                              )}
                            </div>
                            {field.field_type === "select" && (
                              <div className="text-xs text-muted-foreground ml-9">
                                Opsi:{" "}
                                {(() => {
                                  try {
                                    const opts = typeof field.options === "string"
                                      ? JSON.parse(field.options)
                                      : field.options;
                                    return Array.isArray(opts) ? opts.join(", ") : String(field.options || "");
                                  } catch {
                                    return String(field.options || "");
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                          {canEditEvent() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-600"
                              onClick={() => handleDeleteField(field.id)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )})}
                </div>

                {canEditEvent() && (
                  <div>
                    <Card className="sticky top-20">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Tambah Pertanyaan
                        </CardTitle>
                      </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Label Pertanyaan</Label>
                        <Input
                          value={newField.label}
                          onChange={(e) =>
                            setNewField({ ...newField, label: e.target.value })
                          }
                          placeholder="Contoh: Ukuran Baju"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipe Jawaban</Label>
                        <Select
                          value={newField.field_type}
                          onValueChange={(val: any) =>
                            setNewField({ ...newField, field_type: val })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Teks Singkat</SelectItem>
                            <SelectItem value="number">
                              Angka / Nomor HP
                            </SelectItem>
                            <SelectItem value="select">
                              Pilihan Ganda (Dropdown)
                            </SelectItem>
                            <SelectItem value="file">Upload File</SelectItem>
                            <SelectItem value="date">Tanggal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newField.field_type === "select" && (
                        <div className="space-y-2">
                          <Label>Pilihan Opsi</Label>
                          <Input
                            value={newField.options}
                            onChange={(e) =>
                              setNewField({
                                ...newField,
                                options: e.target.value,
                              })
                            }
                            placeholder="Pisahkan koma (Ya, Tidak)"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between border p-3 rounded-lg">
                        <Label htmlFor="req-switch">Wajib Diisi?</Label>
                        <Switch
                          id="req-switch"
                          checked={newField.is_required}
                          onCheckedChange={(c) =>
                            setNewField({ ...newField, is_required: c })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between border p-3 rounded-lg">
                        <div className="space-y-1">
                          <Label htmlFor="conditional-switch">Pertanyaan Bersyarat?</Label>
                          <p className="text-xs text-muted-foreground">
                            Tampilkan pertanyaan ini hanya jika pertanyaan tertentu dijawab dengan nilai tertentu
                          </p>
                        </div>
                        <Switch
                          id="conditional-switch"
                          checked={newField.is_conditional}
                          onCheckedChange={(c) =>
                            setNewField({ ...newField, is_conditional: c, parent_field_id: c ? null : null, conditional_value: c ? "" : "" })
                          }
                        />
                      </div>
                      {newField.is_conditional && (
                        <>
                          <div className="space-y-2">
                            <Label>Pertanyaan Parent</Label>
                            <Select
                              value={newField.parent_field_id?.toString() || ""}
                              onValueChange={(val) =>
                                setNewField({ ...newField, parent_field_id: val ? parseInt(val) : null })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih pertanyaan parent" />
                              </SelectTrigger>
                              <SelectContent>
                                {formFields
                                  .filter(f => f.field_type === "select" && !f.parent_field_id)
                                  .map((field) => (
                                    <SelectItem key={field.id} value={field.id.toString()}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {formFields.filter(f => f.field_type === "select" && !f.parent_field_id).length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                Belum ada pertanyaan pilihan ganda yang bisa dijadikan parent
                              </p>
                            )}
                          </div>
                          {newField.parent_field_id && (() => {
                            const parentField = formFields.find(f => f.id === newField.parent_field_id);
                            const parentOptions = parentField?.options 
                              ? (Array.isArray(parentField.options) ? parentField.options : typeof parentField.options === 'string' ? JSON.parse(parentField.options) : [])
                              : [];
                            return (
                              <div className="space-y-2">
                                <Label>Tampilkan jika dijawab</Label>
                                <Select
                                  value={newField.conditional_value}
                                  onValueChange={(val) =>
                                    setNewField({ ...newField, conditional_value: val })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih nilai" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {parentOptions.map((option: string) => (
                                      <SelectItem key={option} value={option.trim()}>
                                        {option.trim()}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })()}
                        </>
                      )}
                      <Button
                        className="w-full"
                        onClick={handleAddField}
                        disabled={loadingField}
                      >
                        {loadingField ? (
                          "Menyimpan..."
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" /> Tambah
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                )}
                {isReadOnlyMode() && (
                  <div>
                    <Card className="sticky top-20">
                      <CardHeader>
                        <CardTitle className="text-lg">Event Selesai</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Event ini sudah selesai. Form hanya bisa dilihat.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* KONTEN: PARTICIPANTS */}
            <TabsContent value="participants">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Data Pendaftar</CardTitle>
                      <CardDescription>
                        Daftar user yang telah mengisi formulir.
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                      <Download className="w-4 h-4 mr-2" /> Export Excel
                    </Button>
                  </div>
                  {!isReadOnlyMode() && selectedParticipants.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        {selectedParticipants.length} peserta dipilih
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleBulkUpdateStatus("confirmed")}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Terima Terpilih
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleBulkUpdateStatus("rejected")}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Tolak Terpilih
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedParticipants([])}
                      >
                        Batal
                      </Button>
                    </div>
                  )}
                  {isReadOnlyMode() && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="w-4 h-4" />
                        <span>Event sudah selesai - Mode hanya lihat. Hanya bisa export data.</span>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 pr-4">
                          {!isReadOnlyMode() && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-help">
                                  <Checkbox
                                    checked={
                                      participants &&
                                      participants.length > 0 &&
                                      participants
                                        .filter(p => p.status === "pending")
                                        .every(p => selectedParticipants.includes(p.id))
                                    }
                                    onCheckedChange={handleSelectAll}
                                  />
                                  <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
                                    Pilih Semua
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  Pilih semua peserta dengan status "pending" untuk aksi massal
                                  {participants && participants.filter(p => p.status === "pending").length > 0 && (
                                    <span className="block mt-1 font-semibold">
                                      ({participants.filter(p => p.status === "pending").length} peserta pending)
                                    </span>
                                  )}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableHead>
                        <TableHead className="pl-2">Nama Peserta</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal Daftar</TableHead>
                        {event?.event_type === "online" && (
                          <>
                            <TableHead>Kehadiran</TableHead>
                            <TableHead>Bukti Kehadiran</TableHead>
                          </>
                        )}
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!participants || participants.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={event?.event_type === "online" ? 8 : 6}
                              className="text-center h-24 text-muted-foreground"
                            >
                              Belum ada pendaftar.
                            </TableCell>
                          </TableRow>
                        ) : (
                        participants.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              {!isReadOnlyMode() && p.status === "pending" && (
                                <Checkbox
                                  checked={selectedParticipants.includes(p.id)}
                                  onCheckedChange={(checked) =>
                                    handleSelectParticipant(p.id, checked as boolean)
                                  }
                                />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {p.user?.name || "Tanpa Nama"}
                            </TableCell>
                            <TableCell>{p.user?.email || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  p.status === "confirmed"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(p.created_at).toLocaleDateString()}
                            </TableCell>
                            {event?.event_type === "online" && (
                              <>
                                <TableCell>
                                  {p.status === "confirmed" || p.status === "checked_in" ? (
                                    <Switch
                                      key={`attendance-${p.id}-${p.attendance}-${p.status}`}
                                      checked={Boolean(p.attendance) === true}
                                      onCheckedChange={(checked) => {
                                        // Buka dialog konfirmasi sebelum update
                                        handleAttendanceSwitch(
                                          p.id,
                                          p.user?.name || "Peserta",
                                          Boolean(p.attendance),
                                          checked
                                        );
                                      }}
                                    />
                                  ) : (
                                    <Badge variant="outline">Belum Konfirm</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {p.attendance_proof_url ? (
                                    <a
                                      href={p.attendance_proof_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-1"
                                    >
                                      <Eye className="w-4 h-4" />
                                      Lihat Bukti
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isReadOnlyMode() && p.status === "pending" && (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleUpdateStatus(p.id, "confirmed")}
                                      title="Terima Pendaftaran"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() => handleUpdateStatus(p.id, "rejected")}
                                      title="Tolak Pendaftaran"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                    >
                                      Lihat Detail
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>
                                        Detail Jawaban Form
                                      </DialogTitle>
                                      <DialogDescription>
                                        Data dikirim oleh <b>{p.user?.name}</b>
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                                        <div>
                                          <p className="text-xs text-muted-foreground">
                                            ID Pendaftaran
                                          </p>
                                          <p className="font-mono text-sm">
                                            {p.qr_code}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">
                                            Email
                                          </p>
                                          <p className="text-sm">
                                            {p.user?.email}
                                          </p>
                                        </div>
                                      </div>

                                      <Separator />

                                      <div className="space-y-4">
                                        <h4 className="font-semibold text-sm">
                                          Jawaban Kustom:
                                        </h4>
                                        {p.answers && p.answers.length > 0 ? (
                                          p.answers.map((ans) => (
                                            <div
                                              key={ans.id}
                                              className="border-b pb-2 last:border-0"
                                            >
                                              <p className="text-sm font-medium text-slate-700">
                                                {ans.form_field?.label}
                                              </p>
                                              {ans.value.startsWith("http") ? (
                                                <a
                                                  href={ans.value}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-blue-600 underline text-sm"
                                                >
                                                  Lihat File / Gambar
                                                </a>
                                              ) : (
                                                <p className="text-sm mt-1">
                                                  {ans.value}
                                                </p>
                                              )}
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-sm text-muted-foreground italic">
                                            Tidak ada jawaban form tambahan.
                                          </p>
                                        )}
                                      </div>

                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* KONTEN: CERTIFICATES */}
            <TabsContent value="certificates">
              <div className="space-y-6">
                {/* Card Upload Bulk */}
                {canEditEvent() && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        📤 Upload Sertifikat Bulk
                      </CardTitle>
                      <CardDescription>
                        Upload sertifikat secara massal dengan format nama file sesuai email peserta. Setelah upload, cek di tabel dan kirim email secara manual.
                      </CardDescription>
                    </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-white border border-green-200 rounded-lg p-4">
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="bulk-certificates" className="text-base font-semibold">
                              Pilih File Sertifikat (Multiple)
                            </Label>
                            <p className="text-sm text-gray-600 mt-1 mb-3">
                              Maksimal upload: <strong>{event?.quota || 0} file</strong> (sesuai kuota event)
                            </p>
                            <Input
                              id="bulk-certificates"
                              type="file"
                              accept="image/*,.pdf"
                              multiple
                              onChange={async (e) => {
                                const files = e.target.files;
                                if (!files || files.length === 0) return;
                                
                                // Validasi jumlah file
                                if (files.length > (event?.quota || 0)) {
                                  toast.error(`Jumlah file melebihi kuota event. Maksimal: ${event?.quota || 0} file, yang dipilih: ${files.length} file`);
                                  e.target.value = "";
                                  return;
                                }
                                
                                // Validasi format nama file
                                const invalidFiles: string[] = [];
                                for (let i = 0; i < files.length; i++) {
                                  const file = files[i];
                                  const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                                  if (!filenameWithoutExt.includes("@")) {
                                    invalidFiles.push(file.name);
                                  }
                                }
                                
                                if (invalidFiles.length > 0) {
                                  toast.error(
                                    `Format nama file tidak valid. Nama file harus berupa email (contoh: rofi2425@gmail.com.pdf). File tidak valid: ${invalidFiles.join(", ")}`
                                  );
                                  e.target.value = "";
                                  return;
                                }
                                
                                // Simpan files dan input ref untuk diproses setelah konfirmasi
                                setPendingCertificateFiles(files);
                                setCertificateInputRef(e.target);
                                
                                showConfirmDialog(
                                  "Upload Sertifikat",
                                  `Upload ${files.length} sertifikat untuk event ini? Setelah upload, silakan cek di tabel dan kirim email secara manual.`,
                                  async () => {
                                    if (!pendingCertificateFiles) return;
                                    
                                    const formData = new FormData();
                                    for (let i = 0; i < pendingCertificateFiles.length; i++) {
                                      formData.append("certificates", pendingCertificateFiles[i]);
                                    }
                                    
                                    try {
                                      const res = await api.post(`/certificates/event/${event.id}/upload-bulk`, formData, {
                                        headers: {
                                          "Content-Type": "multipart/form-data",
                                        },
                                      });
                                      
                                      const data = res.data.data;
                                      
                                      if (data.failed_count > 0) {
                                        toast.warning(`Upload selesai! Berhasil: ${data.success_count}, Gagal: ${data.failed_count}`);
                                      } else {
                                        toast.success(`Semua ${data.success_count} sertifikat berhasil diupload!`);
                                      }
                                      
                                      fetchParticipants(event.id);
                                    } catch (err: any) {
                                      toast.error(err.response?.data?.message || "Gagal upload sertifikat");
                                    } finally {
                                      setPendingCertificateFiles(null);
                                      if (certificateInputRef) certificateInputRef.value = "";
                                    }
                                  }
                                );
                              }}
                              className="cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 font-semibold mb-2">📋 Format Nama File:</p>
                        <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                          <li>Nama file <strong>harus</strong> sesuai dengan email peserta (contoh: <code className="bg-yellow-100 px-1 rounded">rofi2425@gmail.com.pdf</code>)</li>
                          <li>Format file: JPG, PNG, GIF, WEBP, atau PDF</li>
                          <li>Maksimal upload: <strong>{event?.quota || 0} file</strong> (sesuai kuota event)</li>
                          <li>Setelah upload, <strong>cek di tabel</strong> dan kirim email secara manual menggunakan tombol "Kirim" atau "Kirim Semua"</li>
                          <li>Email peserta harus terdaftar sebagai peserta event ini</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}
                
                {isReadOnlyMode() && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Eye className="w-5 h-5" />
                        Event Selesai - Mode Lihat Saja
                      </CardTitle>
                      <CardDescription className="text-blue-600">
                        Event ini sudah selesai. Anda hanya bisa melihat sertifikat yang sudah dikirim.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {/* Card Daftar Peserta */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Daftar Peserta & Sertifikat</CardTitle>
                        <CardDescription>
                          {canEditEvent() ? 
                            "Upload sertifikat gambar untuk setiap peserta dan kirim via email" :
                            "Lihat daftar peserta yang sudah menerima sertifikat"
                          }
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {/* Tombol Kirim Terpilih */}
                        {canEditEvent() && selectedCertParticipants.length > 0 && (
                          <Button
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={sendingEmails}
                            onClick={() => {
                              const selectedP = participants.filter(p => 
                                selectedCertParticipants.includes(p.id) && 
                                p.certificate_url && 
                                !p.email_sent
                              );
                              
                              if (selectedP.length === 0) {
                                toast.warning("Tidak ada peserta yang bisa dikirim email. Pastikan peserta sudah memiliki sertifikat dan belum dikirim email.");
                                setSelectedCertParticipants([]);
                                return;
                              }
                              
                              const emailList = selectedP.map(p => p.user?.email).filter(Boolean).join(", ");
                              
                              showConfirmDialog(
                                "Kirim Email Sertifikat",
                                `Anda akan mengirim email sertifikat ke ${selectedP.length} peserta: ${emailList}. Lanjutkan?`,
                                async () => {
                                  setSendingEmails(true);
                                  let successCount = 0;
                                  let failedCount = 0;
                                  
                                  for (const p of selectedP) {
                                    try {
                                      await api.post(`/certificates/registration/${p.id}/send-email`);
                                      successCount++;
                                    } catch (err: any) {
                                      failedCount++;
                                    }
                                  }
                                  
                                  if (failedCount > 0) {
                                    toast.warning(`Email terkirim: ${successCount}, Gagal: ${failedCount}`);
                                  } else {
                                    toast.success(`${successCount} email berhasil dikirim!`);
                                  }
                                  
                                  setSelectedCertParticipants([]);
                                  setSendingEmails(false);
                                  fetchParticipants(event.id);
                                }
                              );
                            }}
                          >
                            {sendingEmails ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Mengirim...
                              </>
                            ) : (
                              <>
                                📧 Kirim Terpilih ({selectedCertParticipants.length})
                              </>
                            )}
                          </Button>
                        )}
                        {/* Tombol Kirim Semua */}
                        {(() => {
                          const allSendable = participants.filter(p => p.certificate_url && !p.email_sent);
                          if (allSendable.length > 0) {
                            return (
                              <Button
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={sendingEmails}
                                onClick={() => {
                                  if (allSendable.length === 0) {
                                    toast.warning("Tidak ada peserta yang bisa dikirim email. Semua peserta sudah dikirim atau belum memiliki sertifikat.");
                                    return;
                                  }
                                  
                                  const emailList = allSendable.map(p => p.user?.email).filter(Boolean).join(", ");
                                  
                                  showConfirmDialog(
                                    "Kirim Semua Email Sertifikat",
                                    `Anda akan mengirim email sertifikat ke SEMUA ${allSendable.length} peserta: ${emailList}. Lanjutkan?`,
                                    async () => {
                                      setSendingEmails(true);
                                      try {
                                        const res = await api.post(`/certificates/event/${event.id}/send-email-bulk`);
                                        const data = res.data.data;
                                        
                                        if (data.failed_count > 0) {
                                          toast.warning(`Email terkirim: ${data.success_count}, Gagal: ${data.failed_count}`);
                                        } else {
                                          toast.success(`${data.success_count} email berhasil dikirim!`);
                                        }
                                        
                                        setSelectedCertParticipants([]);
                                        fetchParticipants(event.id);
                                      } catch (err: any) {
                                        toast.error(err.response?.data?.message || "Gagal mengirim email");
                                      } finally {
                                        setSendingEmails(false);
                                      }
                                    }
                                  );
                                }}
                              >
                                {sendingEmails ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Mengirim...
                                  </>
                                ) : (
                                  <>
                                    📧 Kirim Semua ({allSendable.length})
                                  </>
                                )}
                              </Button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                participants.length > 0 &&
                                participants.filter(p => p.certificate_url && !p.email_sent).every(p => 
                                  selectedCertParticipants.includes(p.id)
                                ) &&
                                participants.filter(p => p.certificate_url && !p.email_sent).length > 0
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Select all peserta yang memiliki sertifikat dan belum dikirim email
                                  const sendableIds = participants
                                    .filter(p => p.certificate_url && !p.email_sent)
                                    .map(p => p.id);
                                  setSelectedCertParticipants(sendableIds);
                                } else {
                                  setSelectedCertParticipants([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Nama Peserta</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sertifikat</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!participants || participants.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                              Belum ada peserta.
                            </TableCell>
                          </TableRow>
                        ) : (
                          participants.map((p) => {
                            const canSend = p.certificate_url && !p.email_sent;
                            return (
                              <TableRow key={p.id}>
                                <TableCell>
                                  {canSend ? (
                                    <Checkbox
                                      checked={selectedCertParticipants.includes(p.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedCertParticipants([...selectedCertParticipants, p.id]);
                                        } else {
                                          setSelectedCertParticipants(selectedCertParticipants.filter(id => id !== p.id));
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {p.user?.name || "Tanpa Nama"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {p.user?.email || "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      p.status === "checked_in"
                                        ? "default"
                                        : p.status === "confirmed"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {p.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {p.certificate_url ? (
                                    <Badge variant="default" className="bg-green-600">
                                      ✅ Terupload
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">
                                      ❌ Belum
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {p.email_sent ? (
                                    <Badge variant="default" className="bg-blue-600">
                                      ✅ Terkirim
                                    </Badge>
                                  ) : p.certificate_url ? (
                                    <Badge variant="outline">
                                      ⏳ Belum dikirim
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {p.certificate_url ? (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            window.open(p.certificate_url, "_blank");
                                          }}
                                        >
                                          <Eye className="w-4 h-4 mr-1" /> Lihat
                                        </Button>
                                        {!p.email_sent && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700"
                                            disabled={sendingEmails}
                                            onClick={() => {
                                              showConfirmDialog(
                                                "Kirim Email Sertifikat",
                                                `Kirim email sertifikat ke ${p.user?.email}?`,
                                                async () => {
                                                  try {
                                                    await api.post(`/certificates/registration/${p.id}/send-email`);
                                                    toast.success(`Email berhasil dikirim ke ${p.user?.email}!`);
                                                    fetchParticipants(event.id);
                                                  } catch (err: any) {
                                                    toast.error(err.response?.data?.message || "Gagal mengirim email");
                                                  }
                                                }
                                              );
                                            }}
                                          >
                                            📧 Kirim
                                          </Button>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground text-xs italic">
                                        Gunakan bulk upload di atas (format: {p.user?.email || "email"}.pdf)
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="panitia" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Manajemen Panitia Event</CardTitle>
                      <CardDescription>
                        Kelola anggota panitia yang terlibat dalam event ini
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {canEditEvent() && (
                        <>
                          <Dialog
                            open={showAddMemberDialog}
                            onOpenChange={(open) => {
                              setShowAddMemberDialog(open);
                              setIsLepasMember(false);
                              if (!open) {
                                // Reset state saat dialog ditutup
                                setNewMember({ email: "", role: "" });
                                setEmailSuggestions([]);
                                setShowSuggestions(false);
                                if (searchTimeout) {
                                  clearTimeout(searchTimeout);
                                  setSearchTimeout(null);
                                }
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Panitia
                              </Button>
                            </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Tambah Panitia Baru</DialogTitle>
                            <DialogDescription>
                              Undang user dengan role 1-7 (Super Admin sampai Humas & Media Sosial) sebagai panitia dengan mengisi email mereka
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2 relative">
                              <Label htmlFor="member-email">Email User</Label>
                              <div className="relative">
                                <Input
                                  id="member-email"
                                  type="email"
                                  placeholder="Ketik email user..."
                                  value={newMember.email}
                                  onChange={(e) => handleEmailInputChange(e.target.value, false)}
                                  onFocus={() => {
                                    if (emailSuggestions.length > 0) {
                                      setShowSuggestions(true);
                                    }
                                  }}
                                  onBlur={() => {
                                    // Delay untuk allow click pada suggestion
                                    setTimeout(() => setShowSuggestions(false), 200);
                                  }}
                                  autoComplete="off"
                                />
                                {searchingUsers && (
                                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                              
                              {/* Email Suggestions Dropdown */}
                              {showSuggestions && emailSuggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                                  {emailSuggestions.map((user) => (
                                    <div
                                      key={user.id}
                                      className="px-4 py-2 hover:bg-accent cursor-pointer transition-colors"
                                      onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur
                                        selectEmail(user.email);
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-medium">{user.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            @{user.username} • {user.email}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {showSuggestions && emailSuggestions.length === 0 && newMember.email.length >= 2 && !searchingUsers && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg px-4 py-2 text-sm text-muted-foreground">
                                  Tidak ada user ditemukan
                                </div>
                              )}
                              
                              <p className="text-xs text-muted-foreground">
                                Cari berdasarkan nama, email, atau username. Role 1-7 akan muncul.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="member-role">Divisi/Jabatan</Label>
                              <Input
                                id="member-role"
                                type="text"
                                placeholder="Contoh: Sie Acara, MC 1, PDD, Ketua Panitia, dll"
                                value={newMember.role}
                                onChange={(e) =>
                                  setNewMember({ ...newMember, role: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowAddMemberDialog(false)}
                            >
                              Batal
                            </Button>
                            <Button
                              onClick={handleAddCommitteeMember}
                              disabled={loadingCommittee}
                            >
                              {loadingCommittee ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Menambah...
                                </>
                              ) : (
                                "Tambah"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog
                        open={showAddLepasDialog}
                        onOpenChange={(open) => {
                          setShowAddLepasDialog(open);
                          setIsLepasMember(true);
                          if (!open) {
                            // Reset state saat dialog ditutup
                            setNewMember({ email: "", role: "" });
                            setEmailSuggestions([]);
                            setShowSuggestions(false);
                            if (searchTimeout) {
                              clearTimeout(searchTimeout);
                              setSearchTimeout(null);
                            }
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Panitia Lepas
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Tambah Panitia Lepas</DialogTitle>
                            <DialogDescription>
                              Undang user dengan role 8 (Mahasiswa) sebagai panitia lepas dengan mengisi email mereka
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2 relative">
                              <Label htmlFor="lepas-member-email">Email User</Label>
                              <div className="relative">
                                <Input
                                  id="lepas-member-email"
                                  type="email"
                                  placeholder="Ketik email user..."
                                  value={newMember.email}
                                  onChange={(e) => handleEmailInputChange(e.target.value, true)}
                                  onFocus={() => {
                                    if (emailSuggestions.length > 0) {
                                      setShowSuggestions(true);
                                    }
                                  }}
                                  onBlur={() => {
                                    // Delay untuk allow click pada suggestion
                                    setTimeout(() => setShowSuggestions(false), 200);
                                  }}
                                  autoComplete="off"
                                />
                                {searchingUsers && (
                                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                              
                              {/* Email Suggestions Dropdown */}
                              {showSuggestions && emailSuggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                                  {emailSuggestions.map((user) => (
                                    <div
                                      key={user.id}
                                      className="px-4 py-2 hover:bg-accent cursor-pointer transition-colors"
                                      onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur
                                        selectEmail(user.email);
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-medium">{user.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            @{user.username} • {user.email}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {showSuggestions && emailSuggestions.length === 0 && newMember.email.length >= 2 && !searchingUsers && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg px-4 py-2 text-sm text-muted-foreground">
                                  Tidak ada user ditemukan
                                </div>
                              )}
                              
                              <p className="text-xs text-muted-foreground">
                                Cari berdasarkan nama, email, atau username. Role 8 (Mahasiswa) akan muncul.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lepas-member-role">Divisi/Jabatan</Label>
                              <Input
                                id="lepas-member-role"
                                type="text"
                                placeholder="Contoh: Sie Acara, MC 1, PDD, Ketua Panitia, dll"
                                value={newMember.role}
                                onChange={(e) =>
                                  setNewMember({ ...newMember, role: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowAddLepasDialog(false)}
                            >
                              Batal
                            </Button>
                            <Button
                              onClick={handleAddCommitteeMember}
                              disabled={loadingCommittee}
                            >
                              {loadingCommittee ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Menambah...
                                </>
                              ) : (
                                "Tambah"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCommittee ? (
                    <div className="text-center py-10 text-muted-foreground">
                      Memuat data panitia...
                    </div>
                  ) : committeeMembers.length === 0 ? (
                    <div className="text-center py-10 border border-dashed rounded-lg bg-muted/20">
                      <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-lg font-semibold text-slate-700">
                        Belum ada panitia
                      </p>
                      <p className="text-sm text-slate-500 mb-4">
                        Tambah panitia untuk membantu mengelola event ini
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Divisi/Jabatan</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {committeeMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              {member.user?.name || "N/A"}
                            </TableCell>
                            <TableCell>{member.user?.email || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {member.position || (member.division && member.division !== "-" ? member.division : "N/A")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {canEditEvent() && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-400 hover:text-red-600"
                                  onClick={() => handleRemoveCommitteeMember(member.id)}
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* KONTEN: ANGGARAN */}
            <TabsContent value="anggaran" className="mt-6">
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Rencana (RAB)</CardTitle>
                      <Wallet className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatRupiah(totalPlanAmount)}</div>
                      <p className="text-xs text-muted-foreground">
                        Total anggaran yang direncanakan
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Realisasi</CardTitle>
                      <Receipt className="w-4 h-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatRupiah(totalRealAmount)}</div>
                      <p className="text-xs text-muted-foreground">
                        Pengeluaran aktual yang sudah direalisasikan
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Sisa / Selisih</CardTitle>
                      <Coins className="w-4 h-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${
                          budgetDifference >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatRupiah(budgetDifference)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {budgetDifference >= 0 ? "Hemat dari RAB" : "Overbudget terhadap RAB"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Manajemen Anggaran</CardTitle>
                        <CardDescription>
                          Kelola rencana dan realisasi anggaran per divisi
                        </CardDescription>
                      </div>
                      {canEditEvent() && (
                        <Dialog
                          open={showAddBudgetDialog}
                          onOpenChange={(open) => {
                            setShowAddBudgetDialog(open);
                            if (!open) {
                              setNewBudget({
                                division: "",
                                item_name: "",
                                quantity: 1,
                                plan_amount: "",
                              });
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button>
                              <Plus className="w-4 h-4 mr-2" />
                              Tambah Anggaran
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xl">
                            <DialogHeader>
                              <DialogTitle>Tambah Anggaran</DialogTitle>
                              <DialogDescription>
                                Masukkan detail rencana anggaran untuk event ini
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="budget-division">Divisi/Jabatan (dari panitia)</Label>
                                {divisionOptions.length > 0 ? (
                                  <Select
                                    value={newBudget.division}
                                    onValueChange={(value) =>
                                      setNewBudget({ ...newBudget, division: value })
                                    }
                                  >
                                    <SelectTrigger id="budget-division">
                                      <SelectValue placeholder="Pilih divisi/jabatan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {divisionOptions.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                          {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    id="budget-division"
                                    placeholder="Belum ada data panitia"
                                    value={newBudget.division}
                                    onChange={(e) =>
                                      setNewBudget({ ...newBudget, division: e.target.value })
                                    }
                                    disabled
                                  />
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Pilihan diambil dari Divisi/Jabatan yang tercatat pada panitia.
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="budget-item">Nama Barang</Label>
                                <Input
                                  id="budget-item"
                                  placeholder="Contoh: Sewa sound system"
                                  value={newBudget.item_name}
                                  onChange={(e) =>
                                    setNewBudget({ ...newBudget, item_name: e.target.value })
                                  }
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="budget-qty">Qty</Label>
                                  <Input
                                    id="budget-qty"
                                    type="number"
                                    min={1}
                                    value={newBudget.quantity}
                                    onChange={(e) =>
                                      setNewBudget({
                                        ...newBudget,
                                        quantity: parseInt(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="budget-plan">Rencana Biaya (Total)</Label>
                                  <Input
                                    id="budget-plan"
                                    type="number"
                                    min="0"
                                    value={newBudget.plan_amount}
                                    onChange={(e) =>
                                      setNewBudget({ ...newBudget, plan_amount: e.target.value })
                                    }
                                    placeholder="cth: 1500000"
                                  />
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setShowAddBudgetDialog(false)}
                              >
                                Batal
                              </Button>
                              <Button onClick={handleCreateBudget} disabled={loadingBudgets}>
                                {loadingBudgets ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menyimpan...
                                  </>
                                ) : (
                                  "Simpan"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingBudgets ? (
                      <div className="text-center py-10 text-muted-foreground">
                        Memuat data anggaran...
                      </div>
                    ) : budgets.length === 0 ? (
                      <div className="text-center py-10 border border-dashed rounded-lg bg-muted/20">
                        <p className="text-lg font-semibold text-slate-700">
                          Belum ada data anggaran
                        </p>
                        <p className="text-sm text-slate-500">
                          Tambahkan rencana anggaran pertama Anda.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Divisi</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Rencana (Rp)</TableHead>
                            <TableHead>Realisasi (Rp)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Bukti</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {budgets.map((budget) => {
                            const isRejected = budget.status === "rejected";
                            return (
                              <TableRow
                                key={budget.id}
                                className={
                                  isRejected
                                    ? "bg-red-50/70 text-red-800 hover:bg-red-50/90"
                                    : ""
                                }
                              >
                                <TableCell className="font-medium">{budget.division}</TableCell>
                                <TableCell>{budget.item_name}</TableCell>
                                <TableCell>{budget.quantity}</TableCell>
                                <TableCell>{formatRupiah(budget.plan_amount)}</TableCell>
                                <TableCell>{formatRupiah(budget.real_amount)}</TableCell>
                                <TableCell>
                                  <Badge variant={getBudgetStatusVariant(budget.status)}>
                                    {budget.status || "pending"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {budget.proof_image ? (
                                    <Button variant="outline" size="sm" asChild>
                                      <a
                                        href={budget.proof_image}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Lihat Foto
                                      </a>
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  {canEditEvent() && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isRejected || !canOpenBudgetEdit(budget)}
                                        className={
                                          isRejected || !canOpenBudgetEdit(budget)
                                            ? "opacity-50 cursor-not-allowed"
                                            : ""
                                        }
                                        onClick={() =>
                                          !isRejected && canOpenBudgetEdit(budget) && handleOpenEditBudget(budget)
                                        }
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700"
                                        disabled={!canManageBudget()}
                                        onClick={() => canManageBudget() && handleDeleteBudget(budget.id)}
                                      >
                                        <Trash className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Dialog
                  open={showEditBudgetDialog}
                  onOpenChange={(open) => {
                    setShowEditBudgetDialog(open);
                    if (!open) {
                      setSelectedBudget(null);
                      setEditBudgetProof(null);
                    }
                  }}
                >
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Edit Anggaran</DialogTitle>
                      <DialogDescription>
                        Update rencana/realisasi anggaran serta unggah bukti struk
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-budget-division">Divisi/Jabatan (dari panitia)</Label>
                          {divisionOptions.length > 0 ? (
                            <Select
                              value={editBudgetForm.division}
                              onValueChange={(value) =>
                                setEditBudgetForm({ ...editBudgetForm, division: value })
                              }
                              disabled={!hasFullBudgetAccess()}
                            >
                              <SelectTrigger id="edit-budget-division">
                                <SelectValue placeholder="Pilih divisi/jabatan" />
                              </SelectTrigger>
                              <SelectContent>
                                {divisionOptions.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="edit-budget-division"
                              placeholder="Belum ada data panitia"
                              value={editBudgetForm.division}
                              onChange={(e) =>
                                setEditBudgetForm({ ...editBudgetForm, division: e.target.value })
                              }
                              disabled
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            {hasFullBudgetAccess()
                              ? "Pilihan diambil dari Divisi/Jabatan yang tercatat pada panitia."
                              : "Hanya Bendahara/Super Admin yang dapat mengubah divisi."}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-budget-item">Nama Barang</Label>
                          <Input
                            id="edit-budget-item"
                            value={editBudgetForm.item_name}
                            onChange={(e) =>
                              setEditBudgetForm({ ...editBudgetForm, item_name: e.target.value })
                            }
                            disabled={!hasFullBudgetAccess()}
                          />
                        </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-budget-qty">Qty</Label>
                          <Input
                            id="edit-budget-qty"
                            type="number"
                            min={1}
                            value={editBudgetForm.quantity}
                            onChange={(e) =>
                              setEditBudgetForm({
                                ...editBudgetForm,
                                quantity: parseInt(e.target.value) || 0,
                              })
                            }
                            disabled={!hasFullBudgetAccess()}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-budget-plan">Rencana Biaya (Total)</Label>
                          <Input
                            id="edit-budget-plan"
                            type="number"
                            min="0"
                            value={editBudgetForm.plan_amount}
                            onChange={(e) =>
                              setEditBudgetForm({ ...editBudgetForm, plan_amount: e.target.value })
                            }
                            disabled={!hasFullBudgetAccess()}
                          />
                        </div>
                      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-budget-real">Realisasi Biaya</Label>
                          <Input
                            id="edit-budget-real"
                            type="number"
                            min="0"
                            value={editBudgetForm.real_amount}
                            onChange={(e) =>
                              setEditBudgetForm({ ...editBudgetForm, real_amount: e.target.value })
                            }
                            placeholder="cth: 1200000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Input value="Otomatis: paid jika realisasi > 0, pending jika 0" disabled />
                        </div>
                      </div>

                        <div className="space-y-2">
                          <Label>Bukti Struk (opsional)</Label>
                          {selectedBudget?.proof_image && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Eye className="w-4 h-4" />
                              <a
                                href={selectedBudget.proof_image}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                Lihat bukti saat ini
                              </a>
                            </div>
                          )}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setEditBudgetProof(e.target.files?.[0] ? e.target.files[0] : null)
                            }
                            disabled={!canOpenBudgetEdit(selectedBudget)}
                          />
                          <p className="text-xs text-muted-foreground">
                            {hasFullBudgetAccess()
                              ? "Format: jpg, jpeg, png, gif, webp (Max 5MB)"
                              : "Hanya bisa unggah struk & realisasi; field lain dikunci."}
                          </p>
                        </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowEditBudgetDialog(false)}>
                        Batal
                      </Button>
                      <Button onClick={handleUpdateBudget} disabled={loadingBudgets}>
                        {loadingBudgets ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan Perubahan"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>

            {/* KONTEN: TUGAS (KANBAN BOARD) */}
            <TabsContent value="tugas" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Task Management</CardTitle>
                      <CardDescription>
                        Kelola tugas panitia dengan Kanban Board
                      </CardDescription>
                    </div>
                    {canEditEvent() && (
                      <Dialog
                        open={showAddTaskDialog}
                        onOpenChange={(open) => {
                          setShowAddTaskDialog(open);
                          if (!open) {
                            setNewTask({
                              title: "",
                              description: "",
                              priority: "medium",
                              assigned_to_id: null,
                              due_date: "",
                            });
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Tugas
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Tambah Tugas Baru</DialogTitle>
                          <DialogDescription>
                            Buat tugas baru untuk panitia event
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="task-title">Judul Tugas *</Label>
                            <Input
                              id="task-title"
                              placeholder="Contoh: Siapkan sound system"
                              value={newTask.title}
                              onChange={(e) =>
                                setNewTask({ ...newTask, title: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="task-description">Deskripsi</Label>
                            <Textarea
                              id="task-description"
                              placeholder="Detail tugas..."
                              value={newTask.description}
                              onChange={(e) =>
                                setNewTask({ ...newTask, description: e.target.value })
                              }
                              rows={4}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="task-priority">Prioritas *</Label>
                              <Select
                                value={newTask.priority}
                                onValueChange={(value) =>
                                  setNewTask({ ...newTask, priority: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="task-duedate">Deadline</Label>
                              <Input
                                id="task-duedate"
                                type="datetime-local"
                                value={newTask.due_date}
                                onChange={(e) =>
                                  setNewTask({ ...newTask, due_date: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="task-assignee">Assign To</Label>
                            <Select
                              value={newTask.assigned_to_id?.toString() || "none"}
                              onValueChange={(value) =>
                                setNewTask({
                                  ...newTask,
                                  assigned_to_id: value === "none" ? null : parseInt(value),
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih panitia (opsional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Tidak ada</SelectItem>
                                {committeeMembers.map((member) => {
                                  const userId = (member.user?.id || member.user_id)?.toString();
                                  if (!userId) return null;
                                  const userName = member.user?.name || member.user?.email || "N/A";
                                  const role = member.position || (member.division && member.division !== "-" ? member.division : "");
                                  const displayText = role ? `${userName} - ${role}` : userName;
                                  return (
                                    <SelectItem key={member.id} value={userId}>
                                      {displayText}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowAddTaskDialog(false)}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleCreateTask}
                            disabled={loadingTasks}
                          >
                            {loadingTasks ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menambah...
                              </>
                            ) : (
                              "Tambah"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingTasks ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                      Memuat tugas...
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                      <div className="grid grid-cols-4 gap-4 min-h-[500px]">
                        {[
                          { id: "todo", title: "To Do", color: "bg-gray-100" },
                          { id: "in-progress", title: "In Progress", color: "bg-blue-100" },
                          { id: "review", title: "Review", color: "bg-yellow-100" },
                          { id: "done", title: "Done", color: "bg-green-100" },
                        ].map((column) => {
                          const columnTasks = tasks.filter((task) => task.status === column.id);
                          return (
                            <Droppable key={column.id} droppableId={column.id}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`rounded-lg p-4 ${column.color} ${
                                    snapshot.isDraggingOver ? "opacity-90" : ""
                                  } min-h-[400px]`}
                                >
                                  <h3 className="font-semibold mb-4 text-lg">
                                    {column.title} ({columnTasks.length})
                                  </h3>
                                  <div className="space-y-3">
                                    {columnTasks.map((task, index) => (
                                      <Draggable
                                        key={task.id.toString()}
                                        draggableId={task.id.toString()}
                                        index={index}
                                        isDragDisabled={!canChangeTaskStatus(task)}
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${
                                              snapshot.isDragging ? "opacity-90 rotate-2" : ""
                                            }`}
                                          >
                                            <div 
                                              {...provided.dragHandleProps}
                                              className="cursor-grab active:cursor-grabbing"
                                            >
                                              <div className="flex justify-between items-start mb-2">
                                                <h4 
                                                  className="font-medium text-sm flex-1 cursor-pointer hover:text-primary"
                                                  onClick={() => {
                                                    setSelectedTask(task);
                                                    setNewComment("");
                                                    setShowTaskDetailDialog(true);
                                                  }}
                                                >
                                                  {task.title}
                                                </h4>
                                                {canEditEvent() && (
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-400 hover:text-red-600"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteTask(task.id);
                                                    }}
                                                  >
                                                    <Trash className="w-3 h-3" />
                                                  </Button>
                                                )}
                                              </div>
                                              {task.description && (
                                                <p 
                                                  className="text-xs text-muted-foreground mb-2 line-clamp-2 cursor-pointer hover:text-foreground"
                                                  onClick={() => {
                                                    setSelectedTask(task);
                                                    setNewComment("");
                                                    setShowTaskDetailDialog(true);
                                                  }}
                                                >
                                                  {task.description}
                                                </p>
                                              )}
                                            </div>
                                            <div className="flex items-center justify-between mt-2" onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedTask(task);
                                              setNewComment("");
                                              setShowTaskDetailDialog(true);
                                            }}>
                                              <Badge
                                                variant="outline"
                                                className={
                                                  task.priority === "high"
                                                    ? "border-red-500 text-red-700 bg-red-50"
                                                    : task.priority === "medium"
                                                    ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                                                    : "border-green-500 text-green-700 bg-green-50"
                                                }
                                              >
                                                {task.priority === "high"
                                                  ? "High"
                                                  : task.priority === "medium"
                                                  ? "Medium"
                                                  : "Low"}
                                              </Badge>
                                              {task.assigned_to && (
                                                <div className="flex items-center gap-1">
                                                  <Avatar className="h-6 w-6">
                                                    <AvatarImage
                                                      src={task.assigned_to.avatar}
                                                      alt={task.assigned_to.name}
                                                    />
                                                    <AvatarFallback className="text-xs">
                                                      {task.assigned_to.name
                                                        ?.charAt(0)
                                                        .toUpperCase() || "U"}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                  <span className="text-xs text-muted-foreground">
                                                    {task.assigned_to.name?.split(" ")[0] || ""}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            {task.due_date && (
                                              <div className="mt-2 text-xs text-muted-foreground">
                                                📅{" "}
                                                {new Date(task.due_date).toLocaleDateString(
                                                  "id-ID",
                                                  {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                  }
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                </div>
                              )}
                            </Droppable>
                          );
                        })}
                      </div>
                    </DragDropContext>
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
                                  src={selectedTask.assigned_to.avatar}
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

                          {(canUploadProof(selectedTask) || canEditTask()) && (
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
                      <DialogFooter className="flex justify-between">
                        <div>
                          {canEditTask() && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                // Set edit task state dari selected task
                                setEditTask({
                                  title: selectedTask.title,
                                  description: selectedTask.description || "",
                                  priority: selectedTask.priority,
                                  status: selectedTask.status,
                                  assigned_to_id: selectedTask.assigned_to_id || null,
                                  due_date: selectedTask.due_date
                                    ? new Date(selectedTask.due_date)
                                        .toISOString()
                                        .slice(0, 16)
                                    : "",
                                });
                                setShowEditTaskDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Tugas
                            </Button>
                          )}
                        </div>
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

              {/* Dialog Edit Task */}
              <Dialog
                open={showEditTaskDialog}
                onOpenChange={(open) => {
                  setShowEditTaskDialog(open);
                  if (!open) {
                    setEditTask({
                      title: "",
                      description: "",
                      priority: "medium",
                      status: "todo",
                      assigned_to_id: null,
                      due_date: "",
                    });
                  }
                }}
              >
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Tugas</DialogTitle>
                    <DialogDescription>
                      Edit detail tugas ini
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-task-title">Judul Tugas *</Label>
                      <Input
                        id="edit-task-title"
                        placeholder="Contoh: Siapkan sound system"
                        value={editTask.title}
                        onChange={(e) =>
                          setEditTask({ ...editTask, title: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-task-description">Deskripsi</Label>
                      <Textarea
                        id="edit-task-description"
                        placeholder="Detail tugas..."
                        value={editTask.description}
                        onChange={(e) =>
                          setEditTask({ ...editTask, description: e.target.value })
                        }
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-task-priority">Prioritas *</Label>
                        <Select
                          value={editTask.priority}
                          onValueChange={(value) =>
                            setEditTask({ ...editTask, priority: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-task-status">Status</Label>
                        <Select
                          value={editTask.status}
                          onValueChange={(value) =>
                            setEditTask({ ...editTask, status: value })
                          }
                          disabled={!canChangeTaskStatus(selectedTask)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                        {!canChangeTaskStatus(selectedTask) && (
                          <p className="text-xs text-muted-foreground">
                            Anda tidak dapat mengubah status. Hanya yang memberi tugas atau panitia yang dapat mengubah status.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-task-duedate">Deadline</Label>
                        <Input
                          id="edit-task-duedate"
                          type="datetime-local"
                          value={editTask.due_date}
                          onChange={(e) =>
                            setEditTask({ ...editTask, due_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-task-assignee">Assign To</Label>
                        <Select
                          value={editTask.assigned_to_id?.toString() || "none"}
                          onValueChange={(value) =>
                            setEditTask({
                              ...editTask,
                              assigned_to_id: value === "none" ? null : parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih panitia (opsional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Tidak ada</SelectItem>
                            {committeeMembers.map((member) => {
                              const userId = (member.user?.id || member.user_id)?.toString();
                              if (!userId) return null;
                              const userName = member.user?.name || member.user?.email || "N/A";
                              const role = member.position || (member.division && member.division !== "-" ? member.division : "");
                              const displayText = role ? `${userName} - ${role}` : userName;
                              return (
                                <SelectItem key={member.id} value={userId}>
                                  {displayText}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowEditTaskDialog(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleEditTask}
                      disabled={loadingTasks}
                    >
                      {loadingTasks ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* KONTEN: LOGISTIK */}
            <TabsContent value="logistik" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Peminjaman Barang</CardTitle>
                      <CardDescription>
                        Ajukan peminjaman barang untuk event ini
                      </CardDescription>
                    </div>
                    {canEditEvent() && (
                      <Dialog open={showRequestLoanDialog} onOpenChange={setShowRequestLoanDialog}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajukan Peminjaman
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Ajukan Peminjaman Barang</DialogTitle>
                            <DialogDescription>
                              Pilih barang yang ingin dipinjam untuk event ini
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="loan_date">Tanggal Pinjam *</Label>
                                <DatePickerInput
                                  value={loanForm.loan_date}
                                  onChange={(date) =>
                                    setLoanForm({ ...loanForm, loan_date: date })
                                  }
                                  placeholder="Pilih tanggal pinjam"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="return_date">Tanggal Kembali *</Label>
                                <DatePickerInput
                                  value={loanForm.return_date}
                                  onChange={(date) =>
                                    setLoanForm({ ...loanForm, return_date: date })
                                  }
                                  placeholder="Pilih tanggal kembali"
                                />
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="notes">Catatan (Opsional)</Label>
                              <Textarea
                                id="notes"
                                value={loanForm.notes}
                                onChange={(e) =>
                                  setLoanForm({ ...loanForm, notes: e.target.value })
                                }
                                placeholder="Catatan tambahan..."
                                rows={3}
                              />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <Label>Barang yang Dipinjam *</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addLoanItem}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Tambah Barang
                                </Button>
                              </div>
                              {loanItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Belum ada barang yang ditambahkan. Klik "Tambah Barang" untuk menambahkan.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {loanItems.map((item, index) => (
                                    <div
                                      key={index}
                                      className="p-4 border rounded-lg space-y-3"
                                    >
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-2">
                                          <Label>Nama Barang *</Label>
                                          <Input
                                            value={item.item_name}
                                            onChange={(e) =>
                                              updateLoanItem(
                                                index,
                                                "item_name",
                                                e.target.value
                                              )
                                            }
                                            placeholder="Contoh: Proyektor Epson"
                                            required
                                          />
                                        </div>
                                        <div className="grid gap-2">
                                          <Label>Jumlah *</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) =>
                                              updateLoanItem(
                                                index,
                                                "quantity",
                                                parseInt(e.target.value) || 1
                                              )
                                            }
                                            required
                                          />
                                        </div>
                                      </div>
                                      <div className="grid gap-2">
                                        <Label>Pemberi Pinjaman/Vendor</Label>
                                        <Input
                                          value={item.supplier}
                                          onChange={(e) =>
                                            updateLoanItem(
                                              index,
                                              "supplier",
                                              e.target.value
                                            )
                                          }
                                          placeholder="Contoh: PT. Rental Equipment"
                                        />
                                      </div>
                                      <div className="grid gap-2">
                                        <Label>Keterangan</Label>
                                        <Textarea
                                          value={item.description}
                                          onChange={(e) =>
                                            updateLoanItem(
                                              index,
                                              "description",
                                              e.target.value
                                            )
                                          }
                                          placeholder="Keterangan tambahan (opsional)"
                                          rows={2}
                                        />
                                      </div>
                                      <div className="flex justify-end">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeLoanItem(index)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Hapus
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowRequestLoanDialog(false);
                                setLoanForm({ loan_date: "", return_date: "", notes: "" });
                                setLoanItems([]);
                              }}
                            >
                              Batal
                            </Button>
                            <Button
                              type="button"
                              onClick={handleRequestLoan}
                              disabled={loanItems.length === 0 || loadingLoan}
                            >
                              {loadingLoan ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Memproses...
                                </>
                              ) : (
                                "Ajukan"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingLoan ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : loans.length > 0 ? (
                    <div className="space-y-4">
                      {loans.map((loan: any) => (
                        <Card key={loan.id} className="border">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    loan.status === "approved"
                                      ? "default"
                                      : loan.status === "pending"
                                      ? "secondary"
                                      : loan.status === "returned"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className={
                                    loan.status === "approved"
                                      ? "bg-green-500"
                                      : loan.status === "returned"
                                      ? "bg-blue-500"
                                      : ""
                                  }
                                >
                                  {loan.status === "pending"
                                    ? "Pending"
                                    : loan.status === "approved"
                                    ? "Disetujui"
                                    : loan.status === "returned"
                                    ? "Dikembalikan"
                                    : "Ditolak"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(loan.created_at).toLocaleDateString("id-ID")}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm text-muted-foreground">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                Pinjam: {new Date(loan.loan_date).toLocaleDateString("id-ID")} -{" "}
                                Kembali: {new Date(loan.return_date).toLocaleDateString("id-ID")}
                              </p>
                              {loan.notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Catatan: {loan.notes}
                                </p>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div>
                              <h4 className="font-semibold mb-3">Barang yang Dipinjam:</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Nama Barang</TableHead>
                                    <TableHead>Jumlah</TableHead>
                                    <TableHead>Pemberi Pinjaman</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {loan.items?.map((item: any) => (
                                    <TableRow key={item.id}>
                                      <TableCell>
                                        <div>
                                          <div className="font-medium">{item.item_name}</div>
                                          {item.description && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                              {item.description}
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell>{item.supplier || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Belum ada request peminjaman untuk event ini
                      </p>
                      <Button onClick={() => setShowRequestLoanDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajukan Peminjaman
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
      <SidebarRight />
      
      {/* AlertDialog untuk konfirmasi update attendance */}
      <AlertDialog open={attendanceConfirm.open} onOpenChange={(open) => {
        if (!open) {
          // Revert Switch ke posisi awal jika user menutup dialog tanpa konfirmasi
          if (attendanceConfirm.participantId) {
            setParticipants(prevParticipants => 
              prevParticipants.map(p => {
                if (p.id === attendanceConfirm.participantId) {
                  return { ...p, attendance: attendanceConfirm.currentAttendance };
                }
                return p;
              })
            );
          }
          setAttendanceConfirm({ open: false, participantId: null, participantName: "", currentAttendance: false, newAttendance: false });
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Ubah Kehadiran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengubah kehadiran <strong>{attendanceConfirm.participantName}</strong> dari{" "}
              <strong>{attendanceConfirm.currentAttendance ? "Hadir" : "Tidak Hadir"}</strong> menjadi{" "}
              <strong>{attendanceConfirm.newAttendance ? "Hadir" : "Tidak Hadir"}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                // Revert Switch ke posisi awal
                if (attendanceConfirm.participantId) {
                  setParticipants(prevParticipants => 
                    prevParticipants.map(p => {
                      if (p.id === attendanceConfirm.participantId) {
                        return { ...p, attendance: attendanceConfirm.currentAttendance };
                      }
                      return p;
                    })
                  );
                }
                setAttendanceConfirm({ open: false, participantId: null, participantName: "", currentAttendance: false, newAttendance: false });
              }}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateAttendance}
              className={attendanceConfirm.newAttendance ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {attendanceConfirm.newAttendance ? "Ya, Setujui Hadir" : "Ya, Setujui Tidak Hadir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generic Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ ...confirmDialog, open: false });
            // Reset pending certificate files jika dialog dibatalkan
            if (pendingCertificateFiles) {
              setPendingCertificateFiles(null);
              if (certificateInputRef) certificateInputRef.value = "";
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmDialog({ ...confirmDialog, open: false });
                // Reset pending certificate files
                if (pendingCertificateFiles) {
                  setPendingCertificateFiles(null);
                  if (certificateInputRef) certificateInputRef.value = "";
                }
              }}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog({ ...confirmDialog, open: false });
              }}
              className={confirmDialog.variant === "destructive" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
