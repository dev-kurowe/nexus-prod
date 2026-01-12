import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  Package,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LoanItem {
  id: number;
  item_name: string;
  quantity: number;
  supplier: string;
  description: string;
}

interface Loan {
  id: number;
  event_id: number;
  event: {
    id: number;
    title: string;
    slug: string;
  };
  loan_date: string;
  return_date: string;
  status: string;
  notes: string;
  items: LoanItem[];
  created_at: string;
}

export default function LoanApprovalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const isLogistik = user.role === "logistik" || user.role_id === 1;
    if (!isLogistik) {
      toast.error("Akses ditolak. Hanya Admin atau Logistik yang dapat mengakses halaman ini.");
      navigate("/dashboard");
      return;
    }

    fetchLoans();
  }, [user, navigate, statusFilter]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const url = statusFilter && statusFilter !== "all" ? `/loans?status=${statusFilter}` : "/loans";
      const response = await api.get(url);
      if (response.data.success) {
        setLoans(response.data.data);
      }
    } catch (error: any) {
      toast.error("Gagal mengambil data peminjaman: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (loanId: number) => {
    try {
      await api.post(`/loans/${loanId}/approve`);
      toast.success("Peminjaman berhasil disetujui");
      fetchLoans();
    } catch (error: any) {
      toast.error("Gagal menyetujui: " + (error.response?.data?.message || error.message));
    }
  };

  const handleReject = async (loanId: number) => {
    try {
      await api.post(`/loans/${loanId}/reject`);
      toast.success("Peminjaman ditolak");
      fetchLoans();
    } catch (error: any) {
      toast.error("Gagal menolak: " + (error.response?.data?.message || error.message));
    }
  };

  const handleReturn = async (loanId: number) => {
    try {
      await api.post(`/loans/${loanId}/return`);
      toast.success("Pengembalian berhasil dicatat");
      fetchLoans();
    } catch (error: any) {
      toast.error("Gagal mencatat pengembalian: " + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500">Disetujui</Badge>;
      case "returned":
        return <Badge variant="default" className="bg-blue-500">Dikembalikan</Badge>;
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const pendingLoans = loans.filter((loan) => loan.status === "pending");
  const approvedLoans = loans.filter((loan) => loan.status === "approved");

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Logistik & Aset</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Approval Peminjaman</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Approval Peminjaman
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Kelola request peminjaman barang dari semua event
                  </p>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="returned">Dikembalikan</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  {pendingLoans.length > 0 && statusFilter === "all" && (
                    <Card className="mb-6 border-orange-200 bg-orange-50">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Pending Approval ({pendingLoans.length})
                        </CardTitle>
                        <CardDescription>
                          Ada {pendingLoans.length} request peminjaman yang menunggu persetujuan
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  )}

                  {loans.length === 0 ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">
                            {statusFilter && statusFilter !== "all"
                              ? "Tidak ada peminjaman dengan status ini"
                              : "Belum ada request peminjaman"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {loans.map((loan) => (
                        <Card key={loan.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">
                                  {loan.event.title}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      <span className="text-sm">
                                        Pinjam: {format(new Date(loan.loan_date), "dd MMM yyyy")}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      <span className="text-sm">
                                        Kembali: {format(new Date(loan.return_date), "dd MMM yyyy")}
                                      </span>
                                    </div>
                                  </div>
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(loan.status)}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Barang yang Dipinjam:</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Nama Barang</TableHead>
                                      <TableHead>Jumlah</TableHead>
                                      <TableHead>Pemberi Pinjaman</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {loan.items.map((item) => (
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

                              {loan.notes && (
                                <div>
                                  <h4 className="font-semibold mb-1">Catatan:</h4>
                                  <p className="text-sm text-muted-foreground">{loan.notes}</p>
                                </div>
                              )}

                              <div className="flex justify-end gap-2 pt-2 border-t">
                                {loan.status === "pending" && (
                                  <>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <XCircle className="mr-2 h-4 w-4" />
                                          Tolak
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Tolak Peminjaman?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Apakah Anda yakin ingin menolak request peminjaman ini?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Batal</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleReject(loan.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Tolak
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm">
                                          <CheckCircle className="mr-2 h-4 w-4" />
                                          Setujui
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Setujui Peminjaman?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Stok akan dikurangi setelah disetujui. Pastikan stok tersedia mencukupi.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Batal</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleApprove(loan.id)}>
                                            Setujui
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                                {loan.status === "approved" && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="default">
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Tandai Dikembalikan
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Tandai Dikembalikan?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Stok akan dikembalikan setelah ditandai dikembalikan.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleReturn(loan.id)}>
                                          Tandai Dikembalikan
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </main>
            <SidebarRight />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
