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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Inventory {
  id: number;
  name: string;
  description: string;
  total_stock: number;
  available_stock: number;
  condition: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    total_stock: 0,
    condition: "Good",
    image_url: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Cek apakah user adalah logistik atau super admin
    const isLogistik = user.role === "logistik" || user.role_id === 1;
    if (!isLogistik) {
      toast.error("Akses ditolak. Hanya Admin atau Logistik yang dapat mengakses halaman ini.");
      navigate("/dashboard");
      return;
    }

    fetchInventories();
  }, [user, navigate]);

  const fetchInventories = async () => {
    try {
      setLoading(true);
      const response = await api.get("/inventory");
      if (response.data.success) {
        setInventories(response.data.data);
      }
    } catch (error: any) {
      toast.error("Gagal mengambil data barang: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && editingItem) {
        // Update
        await api.put(`/inventory/${editingItem.id}`, formData);
        toast.success("Barang berhasil diupdate");
      } else {
        // Create
        await api.post("/inventory", formData);
        toast.success("Barang berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchInventories();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (item: Inventory) => {
    setEditingItem(item);
    setIsEditMode(true);
    setFormData({
      name: item.name,
      description: item.description || "",
      total_stock: item.total_stock,
      condition: item.condition,
      image_url: item.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/inventory/${id}`);
      toast.success("Barang berhasil dihapus");
      fetchInventories();
    } catch (error: any) {
      toast.error("Gagal menghapus: " + (error.response?.data?.message || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      total_stock: 0,
      condition: "Good",
      image_url: "",
    });
    setIsEditMode(false);
    setEditingItem(null);
  };

  const getStockStatus = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage === 0) return { label: "Habis", variant: "destructive" as const };
    if (percentage < 30) return { label: "Kritis", variant: "destructive" as const };
    if (percentage < 50) return { label: "Sedikit", variant: "secondary" as const };
    return { label: "Tersedia", variant: "default" as const };
  };

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
                  <BreadcrumbPage>Master Inventori</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Master Inventori</h1>
                  <p className="text-muted-foreground mt-1">
                    Kelola daftar barang dan aset himpunan
                  </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      resetForm();
                      setIsDialogOpen(true);
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah Barang
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {isEditMode ? "Edit Barang" : "Tambah Barang Baru"}
                      </DialogTitle>
                      <DialogDescription>
                        {isEditMode
                          ? "Ubah informasi barang yang ada"
                          : "Tambahkan barang baru ke dalam inventori"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Nama Barang *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            required
                            placeholder="Contoh: Proyektor Epson"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Deskripsi</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="Deskripsi barang (opsional)"
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="total_stock">Stok Total *</Label>
                            <Input
                              id="total_stock"
                              type="number"
                              min="0"
                              value={formData.total_stock}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  total_stock: parseInt(e.target.value) || 0,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="condition">Kondisi</Label>
                            <Select
                              value={formData.condition}
                              onValueChange={(value) =>
                                setFormData({ ...formData, condition: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Good">Baik</SelectItem>
                                <SelectItem value="Broken">Rusak</SelectItem>
                                <SelectItem value="Maintenance">Perawatan</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="image_url">URL Gambar (Opsional)</Label>
                          <Input
                            id="image_url"
                            value={formData.image_url}
                            onChange={(e) =>
                              setFormData({ ...formData, image_url: e.target.value })
                            }
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsDialogOpen(false);
                            resetForm();
                          }}
                        >
                          Batal
                        </Button>
                        <Button type="submit">
                          {isEditMode ? "Update" : "Simpan"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Daftar Barang</CardTitle>
                    <CardDescription>
                      Total {inventories.length} barang terdaftar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {inventories.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Belum ada barang yang terdaftar
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Stok Total</TableHead>
                            <TableHead>Stok Tersedia</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Kondisi</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventories.map((item) => {
                            const stockStatus = getStockStatus(
                              item.available_stock,
                              item.total_stock
                            );
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  {item.name}
                                </TableCell>
                                <TableCell>{item.total_stock}</TableCell>
                                <TableCell>
                                  <span
                                    className={
                                      item.available_stock === 0
                                        ? "text-destructive font-semibold"
                                        : ""
                                    }
                                  >
                                    {item.available_stock}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={stockStatus.variant}>
                                    {stockStatus.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      item.condition === "Good"
                                        ? "default"
                                        : item.condition === "Broken"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {item.condition === "Good"
                                      ? "Baik"
                                      : item.condition === "Broken"
                                      ? "Rusak"
                                      : "Perawatan"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(item)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Hapus Barang?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Apakah Anda yakin ingin menghapus{" "}
                                            <strong>{item.name}</strong>? Tindakan
                                            ini tidak dapat dibatalkan.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Batal</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDelete(item.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Hapus
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </main>
            <SidebarRight />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
