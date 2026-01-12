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
import { Pencil, Trash2, Plus, Users, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { MasterUser } from "@/services/masterService";
import {
  getMasterUsers,
  createMasterUser,
  updateMasterUser,
  deleteMasterUser,
  getRoles,
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

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MasterUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    faculty: "",
    major: "",
    role_id: 0,
  });

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ["masterUsers"],
    queryFn: getMasterUsers,
  });

  // Fetch roles for dropdown
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createMasterUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterUsers"] });
      toast.success("User berhasil ditambahkan");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambah user");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MasterUser> }) =>
      updateMasterUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterUsers"] });
      toast.success("User berhasil diupdate");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate user");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMasterUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterUsers"] });
      toast.success("User berhasil dihapus");
      setIsDeleteOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus user");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      faculty: "",
      major: "",
      role_id: 0,
    });
    setSelectedUser(null);
    setShowPassword(false);
  };

  const handleCreate = () => {
    if (!formData.name || !formData.username || !formData.email || !formData.password || !formData.role_id) {
      toast.error("Harap lengkapi semua field yang wajib diisi");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (user: MasterUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      password: "",
      faculty: user.faculty || "",
      major: user.major || "",
      role_id: user.role_id,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedUser) {
      const dataToSend: any = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        faculty: formData.faculty,
        major: formData.major,
        role_id: formData.role_id,
      };
      
      // Jika password diisi, kirim juga
      if (formData.password) {
        dataToSend.password = formData.password;
      }
      
      updateMutation.mutate({ id: selectedUser.id, data: dataToSend });
    }
  };

  const handleDelete = (user: MasterUser) => {
    if (user.id === 1) {
      toast.error("Superadmin tidak dapat dihapus");
      return;
    }
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const users = data?.data || [];
  const roles = rolesData?.data || [];

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
                <BreadcrumbPage>Master Data / User</BreadcrumbPage>
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
                  Master User
                </h1>
                <p className="text-muted-foreground">Kelola data pengguna</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah User
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Fakultas</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        Belum ada data user
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user: MasterUser) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {user.role?.name || "-"}
                          </span>
                        </TableCell>
                        <TableCell>{user.faculty || "-"}</TableCell>
                        <TableCell>{user.major || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user)}
                              disabled={user.id === 1}
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tambah User</DialogTitle>
                <DialogDescription>Tambahkan data user baru</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nama *</Label>
                    <Input
                      id="name"
                      placeholder="Nama lengkap"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      placeholder="Username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role_id.toString()}
                    onValueChange={(value) => setFormData({ ...formData, role_id: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role: any) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name} ({role.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="faculty">Fakultas</Label>
                    <Input
                      id="faculty"
                      placeholder="Fakultas (optional)"
                      value={formData.faculty}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="major">Program Studi</Label>
                    <Input
                      id="major"
                      placeholder="Program Studi (optional)"
                      value={formData.major}
                      onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    />
                  </div>
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Ubah data user</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Nama *</Label>
                    <Input
                      id="edit-name"
                      placeholder="Nama lengkap"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-username">Username *</Label>
                    <Input
                      id="edit-username"
                      placeholder="Username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-password">Password (kosongkan jika tidak diubah)</Label>
                    <div className="relative">
                      <Input
                        id="edit-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password baru"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Role *</Label>
                  <Select
                    value={formData.role_id.toString()}
                    onValueChange={(value) => setFormData({ ...formData, role_id: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role: any) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name} ({role.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-faculty">Fakultas</Label>
                    <Input
                      id="edit-faculty"
                      placeholder="Fakultas (optional)"
                      value={formData.faculty}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-major">Program Studi</Label>
                    <Input
                      id="edit-major"
                      placeholder="Program Studi (optional)"
                      value={formData.major}
                      onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    />
                  </div>
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
                <DialogTitle>Hapus User</DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin menghapus user{" "}
                  <strong>{selectedUser?.name}</strong>? Data yang sudah dihapus tidak dapat
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
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
