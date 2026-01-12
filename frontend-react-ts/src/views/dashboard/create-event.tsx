import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X, Users, Mic } from "lucide-react";
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
} from "@/components/ui/breadcrumb";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { DateTimePickerInput } from "@/components/ui/datetime-picker-input";

interface CommitteeMember {
  user_id: number;
  user_name: string;
  user_email: string;
  position: string;
}

interface Speaker {
  id: string;
  name: string;
  title: string;
  photo?: string;
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    quota: "",
    price: "0", // Default gratis (0)
    event_type: "offline", // Default offline
    status: "draft",
    category: "",
    start_date: "",
    end_date: "",
    registration_deadline: "", // Tenggat waktu pendaftaran
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // State untuk panitia
  const [committees, setCommittees] = useState<CommitteeMember[]>([]);
  const [newCommittee, setNewCommittee] = useState({
    email: "",
    position: "",
  });
  const [selectedUser, setSelectedUser] = useState<any | null>(null); // User yang dipilih dari suggestions
  const [emailSuggestions, setEmailSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isLepasMember, setIsLepasMember] = useState(false); // Flag untuk membedakan panitia biasa vs lepas

  // State untuk narasumber
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [newSpeaker, setNewSpeaker] = useState({
    name: "",
    title: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBannerFile(e.target.files[0]);
    }
  };

  // Search users function
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
      // Filter out users yang sudah ada di committees
      const existingUserIds = committees.map(c => c.user_id);
      const filtered = (res.data?.data || []).filter((user: any) => !existingUserIds.includes(user.id));
      setEmailSuggestions(filtered);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Gagal mencari user:", error);
      setEmailSuggestions([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Handle email input change dengan debounce
  const handleEmailInputChange = (value: string, isLepas: boolean = false) => {
    setNewCommittee({ ...newCommittee, email: value });
    // Reset selected user jika email berubah (user edit manual)
    if (selectedUser && selectedUser.email !== value) {
      setSelectedUser(null);
    }
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout untuk debounce
    // Filter: role 1-7 untuk panitia biasa, role 8 untuk panitia lepas
    const roleFilter = isLepas ? "8" : "1-7";
    const timeout = setTimeout(() => {
      searchUsers(value, roleFilter);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  // Select email dari suggestions
  const selectEmail = (user: any) => {
    setNewCommittee({ ...newCommittee, email: user.email });
    setSelectedUser(user); // Simpan user yang dipilih
    setShowSuggestions(false);
    setEmailSuggestions([]);
  };

  // Add committee member
  const handleAddCommittee = async () => {
    if (!newCommittee.email || !newCommittee.position.trim()) {
      toast.error("Email dan jabatan wajib diisi");
      return;
    }

    let userToAdd = selectedUser; // Gunakan selected user jika ada

    // Jika tidak ada selected user, cari dari suggestions
    if (!userToAdd) {
      userToAdd = emailSuggestions.find(u => u.email === newCommittee.email);
    }

    // Jika masih tidak ditemukan, search via API
    if (!userToAdd) {
      setSearchingUsers(true);
      try {
        // Filter: role 1-7 untuk panitia biasa, role 8 untuk panitia lepas
        const roleFilter = isLepasMember ? "8" : "1-7";
        const res = await api.get(`/users/search?q=${encodeURIComponent(newCommittee.email)}&limit=10&role_ids=${roleFilter}`);
        const users = res.data?.data || [];
        // Cari user dengan email yang exact match
        userToAdd = users.find((u: any) => u.email.toLowerCase() === newCommittee.email.toLowerCase());
        
        if (!userToAdd) {
          toast.error(`User tidak ditemukan. Pastikan email benar dan user sudah terdaftar dengan role ${isLepasMember ? "8 (Mahasiswa)" : "1-7"} untuk ${isLepasMember ? "panitia lepas" : "panitia biasa"}.`);
          setSearchingUsers(false);
          return;
        }
      } catch (error) {
        console.error("Gagal mencari user:", error);
        toast.error("Gagal mencari user. Silakan coba lagi.");
        setSearchingUsers(false);
        return;
      } finally {
        setSearchingUsers(false);
      }
    }

    // Cek apakah user sudah ada di list
    if (committees.some(c => c.user_id === userToAdd.id)) {
      toast.warning("User ini sudah ditambahkan sebagai panitia");
      return;
    }

    // Tambahkan ke list
    setCommittees([
      ...committees,
      {
        user_id: userToAdd.id,
        user_name: userToAdd.name,
        user_email: userToAdd.email,
        position: newCommittee.position.trim(),
      },
    ]);

    // Reset form
    setNewCommittee({ email: "", position: "" });
    setSelectedUser(null);
    setEmailSuggestions([]);
    setShowSuggestions(false);
    // Tetap pertahankan isLepasMember agar user bisa langsung tambah lagi dengan tipe yang sama
  };

  // Remove committee member
  const handleRemoveCommittee = (user_id: number) => {
    setCommittees(committees.filter(c => c.user_id !== user_id));
  };

  // Add speaker
  const handleAddSpeaker = () => {
    if (!newSpeaker.name.trim() || !newSpeaker.title.trim()) {
      toast.error("Nama dan jabatan narasumber wajib diisi");
      return;
    }

    const speaker: Speaker = {
      id: `speaker-${Date.now()}`,
      name: newSpeaker.name.trim(),
      title: newSpeaker.title.trim(),
    };

    setSpeakers([...speakers, speaker]);
    setNewSpeaker({ name: "", title: "" });
  };

  // Remove speaker
  const handleRemoveSpeaker = (id: string) => {
    setSpeakers(speakers.filter(s => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("location", formData.location);
      data.append("quota", formData.quota);
      data.append("price", formData.price);
      data.append("event_type", formData.event_type);
      data.append("status", formData.status);
      data.append("category", formData.category);
      data.append("start_date", formData.start_date);
      data.append("end_date", formData.end_date);
      
      // Kirim registration_deadline jika diisi
      if (formData.registration_deadline) {
        data.append("registration_deadline", formData.registration_deadline);
      }
      
      if (bannerFile) {
        data.append("banner", bannerFile);
      }

      // Kirim committees sebagai JSON string
      if (committees.length > 0) {
        const committeesData = committees.map(c => ({
          user_id: c.user_id,
          position: c.position,
        }));
        data.append("committees", JSON.stringify(committeesData));
      }

      // Kirim speakers sebagai JSON string
      if (speakers.length > 0) {
        data.append("speakers", JSON.stringify(speakers));
      }

      await api.post("/events", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Gagal membuat event:", error);
      toast.error("Terjadi kesalahan saat membuat event.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background border-b px-4 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Buat Event Baru</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 max-w-3xl mx-auto w-full">
          <Card>
            <CardHeader>
              <CardTitle>Formulir Event</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Judul */}
                <div className="space-y-2">
                  <Label htmlFor="title">Nama Event</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Contoh: Seminar Teknologi 2025"
                    required
                    value={formData.title}
                    onChange={handleChange}
                  />
                </div>

                {/* Banner Upload */}
                <div className="space-y-2">
                  <Label htmlFor="banner">Banner Event</Label>
                  <Input id="banner" type="file" onChange={handleFileChange} accept="image/*" />
                </div>

                {/* Deskripsi */}
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Jelaskan detail event..."
                    required
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lokasi */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Lokasi</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="Gedung Serbaguna / Zoom / Online"
                      required
                      value={formData.location}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Kuota */}
                  <div className="space-y-2">
                    <Label htmlFor="quota">Kuota Peserta</Label>
                    <Input
                      id="quota"
                      name="quota"
                      type="number"
                      placeholder="100"
                      required
                      value={formData.quota}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Event Type (Offline/Online/Hybrid) */}
                <div className="space-y-2">
                  <Label>Tipe Event</Label>
                  <Select 
                    onValueChange={(val) => setFormData({...formData, event_type: val})} 
                    value={formData.event_type}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Tipe Event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offline">Offline (Langsung/On-site)</SelectItem>
                      <SelectItem value="online">Online (Webinar/Zoom)</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Offline + Online)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.event_type === "online" 
                      ? "Event Online: Peserta akan bisa konfirmasi kehadiran sendiri via link di tiket mereka"
                      : formData.event_type === "hybrid"
                      ? "Event Hybrid: Peserta bisa hadir langsung (scan QR) ATAU online (self check-in dengan bukti)"
                      : "Event Offline: Panitia akan scan QR code untuk absensi kehadiran"}
                  </p>
                </div>

                {/* Harga Event */}
                <div className="space-y-2">
                  <Label htmlFor="price">Harga Event (Rp)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    placeholder="0 (Gratis) atau contoh: 50000"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Kosongkan atau isi 0 untuk event gratis (perlu approval panitia). Isi harga untuk event berbayar (auto-approve setelah pembayaran via Midtrans).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* Tanggal Mulai */}
                   <div className="space-y-2">
                    <Label htmlFor="start_date">Tanggal Mulai</Label>
                    <DatePickerInput
                      value={formData.start_date}
                      onChange={(date) => setFormData({...formData, start_date: date})}
                      placeholder="Pilih tanggal mulai"
                    />
                  </div>

                  {/* Tanggal Selesai */}
                   <div className="space-y-2">
                    <Label htmlFor="end_date">Tanggal Selesai</Label>
                    <DatePickerInput
                      value={formData.end_date}
                      onChange={(date) => setFormData({...formData, end_date: date})}
                      placeholder="Pilih tanggal selesai"
                    />
                  </div>
                </div>

                {/* Tenggat Waktu Pendaftaran */}
                <div className="space-y-2">
                  <Label htmlFor="registration_deadline">Tenggat Waktu Pendaftaran (Opsional)</Label>
                  <DateTimePickerInput
                    value={formData.registration_deadline}
                    onChange={(datetime) => setFormData({...formData, registration_deadline: datetime})}
                    placeholder="Pilih batas akhir pendaftaran"
                  />
                  <p className="text-xs text-muted-foreground">
                    Jika diisi, pendaftaran akan otomatis ditutup setelah tanggal dan waktu ini. Kosongkan jika tidak ada batas waktu.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kategori */}
                  <div className="space-y-2">
                    <Label>Kategori Event</Label>
                    <Select 
                      onValueChange={(val) => setFormData({...formData, category: val})} 
                      value={formData.category}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Seminar">Seminar</SelectItem>
                        <SelectItem value="Workshop">Workshop</SelectItem>
                        <SelectItem value="Konser">Konser</SelectItem>
                        <SelectItem value="Lomba">Lomba</SelectItem>
                        <SelectItem value="Exhibition">Exhibition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Status Publish</Label>
                    <Select 
                      onValueChange={(val) => setFormData({...formData, status: val})} 
                      defaultValue="draft"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft (Simpan Dulu)</SelectItem>
                        <SelectItem value="published">Publish (Tampilkan)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Section Panitia */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <Label className="text-lg font-semibold">Panitia Event</Label>
                    <Badge variant="secondary">{committees.length} Panitia</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan panitia yang akan membantu mengelola event ini. Panitia dapat mengelola peserta, tugas, anggaran, dan logistik.
                  </p>

                  {/* Form Add Panitia */}
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex gap-2 mb-4">
                      <Button
                        type="button"
                        variant={!isLepasMember ? "default" : "outline"}
                        onClick={() => {
                          setIsLepasMember(false);
                          setNewCommittee({ email: "", position: "" });
                          setSelectedUser(null);
                          setEmailSuggestions([]);
                          setShowSuggestions(false);
                        }}
                        className="flex-1"
                      >
                        Tambah Panitia (Role 1-7)
                      </Button>
                      <Button
                        type="button"
                        variant={isLepasMember ? "default" : "outline"}
                        onClick={() => {
                          setIsLepasMember(true);
                          setNewCommittee({ email: "", position: "" });
                          setSelectedUser(null);
                          setEmailSuggestions([]);
                          setShowSuggestions(false);
                        }}
                        className="flex-1"
                      >
                        Tambah Panitia Lepas (Role 8)
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Search User */}
                      <div className="space-y-2 relative">
                        <Label htmlFor="committee-email">
                          Cari User (Email/Nama) - {isLepasMember ? "Role 8 (Mahasiswa)" : "Role 1-7"}
                        </Label>
                        <div className="relative">
                          <Input
                            id="committee-email"
                            type="text"
                            placeholder="Ketik email atau nama user..."
                            value={newCommittee.email}
                            onChange={(e) => handleEmailInputChange(e.target.value, isLepasMember)}
                            onFocus={() => {
                              if (emailSuggestions.length > 0) {
                                setShowSuggestions(true);
                              }
                            }}
                            onBlur={() => {
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
                                  e.preventDefault();
                                  selectEmail(user);
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

                        {showSuggestions && emailSuggestions.length === 0 && newCommittee.email.length >= 2 && !searchingUsers && (
                          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg px-4 py-2 text-sm text-muted-foreground">
                            Tidak ada user ditemukan
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          {isLepasMember 
                            ? "Cari berdasarkan nama, email, atau username. Role 8 (Mahasiswa) akan muncul."
                            : "Cari berdasarkan nama, email, atau username. Role 1-7 akan muncul."}
                        </p>
                      </div>

                      {/* Jabatan */}
                      <div className="space-y-2">
                        <Label htmlFor="committee-position">Jabatan</Label>
                        <Input
                          id="committee-position"
                          type="text"
                          placeholder="Contoh: Ketua Panitia, Sie Acara, MC, PDD, dll"
                          value={newCommittee.position}
                          onChange={(e) =>
                            setNewCommittee({ ...newCommittee, position: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddCommittee}
                      className="w-full md:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" /> 
                      {isLepasMember ? "Tambah Panitia Lepas" : "Tambah Panitia"}
                    </Button>
                  </div>

                  {/* List Panitia yang Sudah Ditambahkan */}
                  {committees.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Panitia yang Ditambahkan:</Label>
                      <div className="space-y-2">
                        {committees.map((committee) => (
                          <div
                            key={committee.user_id}
                            className="flex items-center justify-between p-3 bg-card border rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{committee.user_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {committee.user_email}
                              </p>
                              <Badge variant="secondary" className="mt-1">
                                {committee.position}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCommittee(committee.user_id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section Narasumber */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-purple-600" />
                    <Label className="text-lg font-semibold">Narasumber / Pembicara</Label>
                    <Badge variant="secondary">{speakers.length} Narasumber</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan narasumber atau pembicara yang akan tampil di event ini.
                  </p>

                  {/* Form Add Narasumber */}
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Nama Narasumber */}
                      <div className="space-y-2">
                        <Label htmlFor="speaker-name">Nama Narasumber</Label>
                        <Input
                          id="speaker-name"
                          type="text"
                          placeholder="Contoh: Dr. John Doe"
                          value={newSpeaker.name}
                          onChange={(e) => setNewSpeaker({ ...newSpeaker, name: e.target.value })}
                        />
                      </div>

                      {/* Jabatan/Gelar Narasumber */}
                      <div className="space-y-2">
                        <Label htmlFor="speaker-title">Jabatan / Keahlian</Label>
                        <Input
                          id="speaker-title"
                          type="text"
                          placeholder="Contoh: CEO Tech Company / Expert AI"
                          value={newSpeaker.title}
                          onChange={(e) => setNewSpeaker({ ...newSpeaker, title: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddSpeaker}
                      className="w-full md:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Narasumber
                    </Button>
                  </div>

                  {/* List Narasumber */}
                  {speakers.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Narasumber yang Ditambahkan:</Label>
                      <div className="space-y-2">
                        {speakers.map((speaker) => (
                          <div
                            key={speaker.id}
                            className="flex items-center justify-between p-3 bg-card border rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{speaker.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {speaker.title}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSpeaker(speaker.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Event
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}