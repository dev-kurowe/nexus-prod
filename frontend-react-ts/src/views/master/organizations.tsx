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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus, Building } from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/services/masterService";
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getFaculties,
} from "@/services/masterService";import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "",
    faculty_id: 0,
    description: "",
    logo: "",
  });

  // Fetch organizations
  const { data, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
  });

  // Fetch faculties for dropdown
  const { data: facultiesData } = useQuery({
    queryKey: ["faculties"],
    queryFn: getFaculties,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Ormawa berhasil ditambahkan");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambah ormawa");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Organization> }) =>
      updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Ormawa berhasil diupdate");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate ormawa");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Ormawa berhasil dihapus");
      setIsDeleteOpen(false);
      setSelectedOrg(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus ormawa");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      type: "",
      faculty_id: 0,
      description: "",
      logo: "",
    });
  };

  const handleCreate = () => {
    // Jika faculty_id = 0, set menjadi null (untuk ormawa universitas)
    const dataToSend = {
      ...formData,
      faculty_id: formData.faculty_id === 0 ? undefined : formData.faculty_id,
    };
    createMutation.mutate(dataToSend);
  };

  const handleEdit = (org: Organization) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      code: org.code,
      type: org.type,
      faculty_id: org.faculty_id || 0,
      description: org.description || "",
      logo: org.logo || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedOrg) {
      const dataToSend = {
        ...formData,
        faculty_id: formData.faculty_id === 0 ? undefined : formData.faculty_id,
      };
      updateMutation.mutate({ id: selectedOrg.id, data: dataToSend });
    }
  };

  const handleDelete = (org: Organization) => {
    setSelectedOrg(org);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedOrg) {
      deleteMutation.mutate(selectedOrg.id);
    }
  };

  const organizations = data?.data || [];
  const faculties = facultiesData?.data || [];

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
                <BreadcrumbPage>Master Data / Ormawa</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="container mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Building className="h-8 w-8" />
            Master Ormawa
          </h1>
          <p className="text-muted-foreground">
            Kelola data organisasi kemahasiswaan
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Ormawa
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Ormawa</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Fakultas</TableHead>
              <TableHead>Deskripsi</TableHead>
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
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Belum ada data ormawa
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org: Organization) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.code}</TableCell>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        org.type === "BEM"
                          ? "bg-blue-100 text-blue-800"
                          : org.type === "Himpunan"
                          ? "bg-purple-100 text-purple-800"
                          : org.type === "UKM"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {org.type}
                    </span>
                  </TableCell>
                  <TableCell>{org.faculty?.name || "Universitas"}</TableCell>
                  <TableCell>{org.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(org)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(org)}
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Ormawa</DialogTitle>
            <DialogDescription>Tambahkan data ormawa baru</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Ormawa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="BEM Fakultas Teknik"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Kode *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="BEM-FT"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipe *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe ormawa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEM">BEM (Badan Eksekutif Mahasiswa)</SelectItem>
                  <SelectItem value="Himpunan">Himpunan</SelectItem>
                  <SelectItem value="UKM">UKM (Unit Kegiatan Mahasiswa)</SelectItem>
                  <SelectItem value="Senat">Senat</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faculty">
                Fakultas <span className="text-muted-foreground">(Opsional, kosongkan untuk tingkat universitas)</span>
              </Label>
              <Select
                value={formData.faculty_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, faculty_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih fakultas (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Tingkat Universitas</SelectItem>
                  {faculties.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={faculty.id.toString()}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat tentang ormawa"
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
            <DialogTitle>Edit Ormawa</DialogTitle>
            <DialogDescription>Ubah data ormawa</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nama Ormawa *</Label>
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
              <Label htmlFor="edit-type">Tipe *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe ormawa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEM">BEM (Badan Eksekutif Mahasiswa)</SelectItem>
                  <SelectItem value="Himpunan">Himpunan</SelectItem>
                  <SelectItem value="UKM">UKM (Unit Kegiatan Mahasiswa)</SelectItem>
                  <SelectItem value="Senat">Senat</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-faculty">
                Fakultas <span className="text-muted-foreground">(Opsional)</span>
              </Label>
              <Select
                value={formData.faculty_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, faculty_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih fakultas (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Tingkat Universitas</SelectItem>
                  {faculties.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={faculty.id.toString()}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Deskripsi</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            <DialogTitle>Hapus Ormawa</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus ormawa{" "}
              <strong>{selectedOrg?.name}</strong>? Data yang sudah dihapus tidak dapat
              dikembalikan.
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
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
