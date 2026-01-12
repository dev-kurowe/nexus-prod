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
import { Pencil, Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import type { Student } from "@/services/masterService";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudyPrograms,
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

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    nim: "",
    name: "",
    email: "",
    phone: "",
    study_program_id: 0,
    batch: new Date().getFullYear(),
    status: "aktif",
    address: "",
  });

  // Fetch students
  const { data, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });

  // Fetch study programs for dropdown
  const { data: programsData } = useQuery({
    queryKey: ["study-programs"],
    queryFn: getStudyPrograms,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Mahasiswa berhasil ditambahkan");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambah mahasiswa");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Student> }) =>
      updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Mahasiswa berhasil diupdate");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate mahasiswa");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Mahasiswa berhasil dihapus");
      setIsDeleteOpen(false);
      setSelectedStudent(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus mahasiswa");
    },
  });

  const resetForm = () => {
    setFormData({
      nim: "",
      name: "",
      email: "",
      phone: "",
      study_program_id: 0,
      batch: new Date().getFullYear(),
      status: "aktif",
      address: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      nim: student.nim,
      name: student.name,
      email: student.email,
      phone: student.phone,
      study_program_id: student.study_program_id,
      batch: student.batch,
      status: student.status,
      address: student.address || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedStudent) {
      updateMutation.mutate({ id: selectedStudent.id, data: formData });
    }
  };

  const handleDelete = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedStudent) {
      deleteMutation.mutate(selectedStudent.id);
    }
  };

  const students = data?.data || [];
  const programs = programsData?.data || [];

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
                <BreadcrumbPage>Master Data / Mahasiswa</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="container mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Users className="h-8 w-8" />
                  Master Mahasiswa
                </h1>
                <p className="text-muted-foreground">Kelola data mahasiswa</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Mahasiswa
              </Button>
            </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NIM</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Program Studi</TableHead>
              <TableHead>Angkatan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Belum ada data mahasiswa
                </TableCell>
              </TableRow>
            ) : (
              students.map((student: Student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.nim}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.study_program?.name || "-"}</TableCell>
                  <TableCell>{student.batch}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        student.status === "aktif"
                          ? "bg-green-100 text-green-800"
                          : student.status === "cuti"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {student.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(student)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(student)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Mahasiswa</DialogTitle>
            <DialogDescription>Tambahkan data mahasiswa baru</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nim">NIM *</Label>
              <Input
                id="nim"
                value={formData.nim}
                onChange={(e) => setFormData({ ...formData, nim: e.target.value })}
                placeholder="12345678"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Lengkap *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telepon *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="08123456789"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="program">Program Studi *</Label>
              <Select
                value={formData.study_program_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, study_program_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih program studi" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program: any) => (
                    <SelectItem key={program.id} value={program.id.toString()}>
                      {program.name} - {program.faculty?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="batch">Angkatan *</Label>
              <Input
                id="batch"
                type="number"
                value={formData.batch}
                onChange={(e) =>
                  setFormData({ ...formData, batch: parseInt(e.target.value) })
                }
                placeholder="2024"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="cuti">Cuti</SelectItem>
                  <SelectItem value="lulus">Lulus</SelectItem>
                  <SelectItem value="keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Alamat lengkap mahasiswa"
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Mahasiswa</DialogTitle>
            <DialogDescription>Ubah data mahasiswa</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nim">NIM *</Label>
              <Input
                id="edit-nim"
                value={formData.nim}
                onChange={(e) => setFormData({ ...formData, nim: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nama Lengkap *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Telepon *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-program">Program Studi *</Label>
              <Select
                value={formData.study_program_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, study_program_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih program studi" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program: any) => (
                    <SelectItem key={program.id} value={program.id.toString()}>
                      {program.name} - {program.faculty?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-batch">Angkatan *</Label>
              <Input
                id="edit-batch"
                type="number"
                value={formData.batch}
                onChange={(e) =>
                  setFormData({ ...formData, batch: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="cuti">Cuti</SelectItem>
                  <SelectItem value="lulus">Lulus</SelectItem>
                  <SelectItem value="keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Alamat</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
            <DialogTitle>Hapus Mahasiswa</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus mahasiswa{" "}
              <strong>{selectedStudent?.name}</strong> ({selectedStudent?.nim})? Data yang
              sudah dihapus tidak dapat dikembalikan.
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
