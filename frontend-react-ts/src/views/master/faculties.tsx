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
import { Pencil, Trash2, Plus, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import type { Faculty } from "@/services/masterService";
import {
  getFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getUniversities,
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

export default function FacultiesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    university_id: 0,
    description: "",
  });

  // Fetch faculties
  const { data, isLoading } = useQuery({
    queryKey: ["faculties"],
    queryFn: getFaculties,
  });

  // Fetch universities for dropdown
  const { data: universitiesData } = useQuery({
    queryKey: ["universities"],
    queryFn: getUniversities,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createFaculty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculties"] });
      toast.success("Fakultas berhasil ditambahkan");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambah fakultas");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Faculty> }) =>
      updateFaculty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculties"] });
      toast.success("Fakultas berhasil diupdate");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate fakultas");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFaculty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculties"] });
      toast.success("Fakultas berhasil dihapus");
      setIsDeleteOpen(false);
      setSelectedFaculty(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus fakultas");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      university_id: 0,
      description: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setFormData({
      name: faculty.name,
      code: faculty.code,
      university_id: faculty.university_id,
      description: faculty.description || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedFaculty) {
      updateMutation.mutate({ id: selectedFaculty.id, data: formData });
    }
  };

  const handleDelete = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedFaculty) {
      deleteMutation.mutate(selectedFaculty.id);
    }
  };

  const faculties = data?.data || [];
  const universities = universitiesData?.data || [];

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
                <BreadcrumbPage>Master Data / Fakultas</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="container mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-8 w-8" />
                  Master Fakultas
                </h1>
                <p className="text-muted-foreground">Kelola data fakultas</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Fakultas
              </Button>
            </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Fakultas</TableHead>
              <TableHead>Universitas</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : faculties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Belum ada data fakultas
                </TableCell>
              </TableRow>
            ) : (
              faculties.map((faculty: Faculty) => (
                <TableRow key={faculty.id}>
                  <TableCell className="font-medium">{faculty.code}</TableCell>
                  <TableCell>{faculty.name}</TableCell>
                  <TableCell>{faculty.university?.name || "-"}</TableCell>
                  <TableCell>{faculty.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(faculty)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(faculty)}
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
            <DialogTitle>Tambah Fakultas</DialogTitle>
            <DialogDescription>Tambahkan data fakultas baru</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Fakultas *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Fakultas Teknik"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Kode *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="FT"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="university">Universitas *</Label>
              <Select
                value={formData.university_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, university_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih universitas" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((university: any) => (
                    <SelectItem key={university.id} value={university.id.toString()}>
                      {university.name}
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
                placeholder="Deskripsi fakultas"
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
            <DialogTitle>Edit Fakultas</DialogTitle>
            <DialogDescription>Ubah data fakultas</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nama Fakultas *</Label>
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
              <Label htmlFor="edit-university">Universitas *</Label>
              <Select
                value={formData.university_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, university_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih universitas" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((university: any) => (
                    <SelectItem key={university.id} value={university.id.toString()}>
                      {university.name}
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
            <DialogTitle>Hapus Fakultas</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus fakultas{" "}
              <strong>{selectedFaculty?.name}</strong>? Data yang sudah dihapus tidak dapat
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
