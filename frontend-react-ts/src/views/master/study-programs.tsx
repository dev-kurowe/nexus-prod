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
import { Pencil, Trash2, Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import type { StudyProgram } from "@/services/masterService";
import {
  getStudyPrograms,
  createStudyProgram,
  updateStudyProgram,
  deleteStudyProgram,
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
export default function StudyProgramsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<StudyProgram | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    faculty_id: 0,
    level: "",
    accreditation: "",
  });

  // Fetch study programs
  const { data, isLoading } = useQuery({
    queryKey: ["study-programs"],
    queryFn: getStudyPrograms,
  });

  // Fetch faculties for dropdown
  const { data: facultiesData } = useQuery({
    queryKey: ["faculties"],
    queryFn: getFaculties,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createStudyProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-programs"] });
      toast.success("Program studi berhasil ditambahkan");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambah program studi");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StudyProgram> }) =>
      updateStudyProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-programs"] });
      toast.success("Program studi berhasil diupdate");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate program studi");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteStudyProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-programs"] });
      toast.success("Program studi berhasil dihapus");
      setIsDeleteOpen(false);
      setSelectedProgram(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus program studi");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      faculty_id: 0,
      level: "",
      accreditation: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (program: StudyProgram) => {
    setSelectedProgram(program);
    setFormData({
      name: program.name,
      code: program.code,
      faculty_id: program.faculty_id,
      level: program.level,
      accreditation: program.accreditation || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedProgram) {
      updateMutation.mutate({ id: selectedProgram.id, data: formData });
    }
  };

  const handleDelete = (program: StudyProgram) => {
    setSelectedProgram(program);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProgram) {
      deleteMutation.mutate(selectedProgram.id);
    }
  };

  const programs = data?.data || [];
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
                <BreadcrumbPage>Master Data / Program Studi</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="container mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <BookOpen className="h-8 w-8" />
                  Master Program Studi
                </h1>
                <p className="text-muted-foreground">Kelola data program studi</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Program Studi
              </Button>
            </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Program Studi</TableHead>
              <TableHead>Fakultas</TableHead>
              <TableHead>Jenjang</TableHead>
              <TableHead>Akreditasi</TableHead>
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
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Belum ada data program studi
                </TableCell>
              </TableRow>
            ) : (
              programs.map((program: StudyProgram) => (
                <TableRow key={program.id}>
                  <TableCell className="font-medium">{program.code}</TableCell>
                  <TableCell>{program.name}</TableCell>
                  <TableCell>{program.faculty?.name || "-"}</TableCell>
                  <TableCell>{program.level}</TableCell>
                  <TableCell>{program.accreditation || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(program)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(program)}
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
            <DialogTitle>Tambah Program Studi</DialogTitle>
            <DialogDescription>Tambahkan data program studi baru</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Program Studi *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Teknik Informatika"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Kode *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="TIF"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faculty">Fakultas *</Label>
              <Select
                value={formData.faculty_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, faculty_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih fakultas" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={faculty.id.toString()}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="level">Jenjang *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenjang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D3">D3</SelectItem>
                  <SelectItem value="D4">D4</SelectItem>
                  <SelectItem value="S1">S1</SelectItem>
                  <SelectItem value="S2">S2</SelectItem>
                  <SelectItem value="S3">S3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accreditation">Akreditasi</Label>
              <Select
                value={formData.accreditation}
                onValueChange={(value) =>
                  setFormData({ ...formData, accreditation: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akreditasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="Unggul">Unggul</SelectItem>
                  <SelectItem value="Baik Sekali">Baik Sekali</SelectItem>
                  <SelectItem value="Baik">Baik</SelectItem>
                </SelectContent>
              </Select>
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
            <DialogTitle>Edit Program Studi</DialogTitle>
            <DialogDescription>Ubah data program studi</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nama Program Studi *</Label>
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
              <Label htmlFor="edit-faculty">Fakultas *</Label>
              <Select
                value={formData.faculty_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, faculty_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih fakultas" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={faculty.id.toString()}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-level">Jenjang *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenjang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D3">D3</SelectItem>
                  <SelectItem value="D4">D4</SelectItem>
                  <SelectItem value="S1">S1</SelectItem>
                  <SelectItem value="S2">S2</SelectItem>
                  <SelectItem value="S3">S3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-accreditation">Akreditasi</Label>
              <Select
                value={formData.accreditation}
                onValueChange={(value) =>
                  setFormData({ ...formData, accreditation: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akreditasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="Unggul">Unggul</SelectItem>
                  <SelectItem value="Baik Sekali">Baik Sekali</SelectItem>
                  <SelectItem value="Baik">Baik</SelectItem>
                </SelectContent>
              </Select>
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
            <DialogTitle>Hapus Program Studi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus program studi{" "}
              <strong>{selectedProgram?.name}</strong>? Data yang sudah dihapus tidak dapat
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
