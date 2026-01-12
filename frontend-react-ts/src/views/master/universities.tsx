import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { University } from "@/services/masterService";
import {
  getUniversities,
  createUniversity,
  updateUniversity,
  deleteUniversity,
} from "@/services/masterService";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export default function UniversitiesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    website: "",
    logo: "",
  });

  // Fetch universities
  const { data, isLoading } = useQuery({
    queryKey: ["universities"],
    queryFn: getUniversities,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createUniversity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] });
      toast.success("Universitas berhasil ditambahkan");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambah universitas");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<University> }) =>
      updateUniversity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] });
      toast.success("Universitas berhasil diupdate");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate universitas");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUniversity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] });
      toast.success("Universitas berhasil dihapus");
      setIsDeleteOpen(false);
      setSelectedUniversity(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus universitas");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      phone: "",
      website: "",
      logo: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (university: University) => {
    setSelectedUniversity(university);
    setFormData({
      name: university.name,
      code: university.code,
      address: university.address || "",
      phone: university.phone || "",
      website: university.website || "",
      logo: university.logo || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedUniversity) {
      updateMutation.mutate({ id: selectedUniversity.id, data: formData });
    }
  };

  const handleDelete = (university: University) => {
    setSelectedUniversity(university);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUniversity) {
      deleteMutation.mutate(selectedUniversity.id);
    }
  };

  const universities = data?.data || [];

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
                <BreadcrumbPage>Master Data / Universitas</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="container mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Building2 className="h-8 w-8" />
                  Master Universitas
                </h1>
                <p className="text-muted-foreground">Kelola data universitas</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Universitas
              </Button>
            </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Website</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : universities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Belum ada data universitas
                </TableCell>
              </TableRow>
            ) : (
              universities.map((university: University) => (
                <TableRow key={university.id}>
                  <TableCell className="font-medium">{university.code}</TableCell>
                  <TableCell>{university.name}</TableCell>
                  <TableCell>{university.address || "-"}</TableCell>
                  <TableCell>{university.phone || "-"}</TableCell>
                  <TableCell>{university.website || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(university)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(university)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
          </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Universitas</DialogTitle>
            <DialogDescription>Tambahkan data universitas baru</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Universitas Indonesia"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Kode *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="UI"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Margonda Raya, Depok"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="021-12345678"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.ui.ac.id"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Universitas</DialogTitle>
            <DialogDescription>Ubah data universitas</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nama *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Kode *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Alamat</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Telepon</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Universitas</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus universitas{" "}
              <strong>{selectedUniversity?.name}</strong>? Data yang sudah dihapus tidak
              dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
