import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
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
import { Loader2, Plus, X, Mic, ArrowLeft } from "lucide-react";
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
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { DateTimePickerInput } from "@/components/ui/datetime-picker-input";

interface Speaker {
  id: string;
  name: string;
  title: string;
  photo?: string;
}

interface EventData {
  id: number;
  title: string;
  slug: string;
  description: string;
  banner: string;
  location: string;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  status: string;
  event_type: string;
  quota: number;
  category: string;
  price: number;
  speakers: string;
}

export default function EditEventPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [eventId, setEventId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    quota: "",
    price: "0",
    event_type: "offline",
    status: "draft",
    category: "",
    start_date: "",
    end_date: "",
    registration_deadline: "",
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [currentBanner, setCurrentBanner] = useState<string>("");

  // State untuk narasumber
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [newSpeaker, setNewSpeaker] = useState({
    name: "",
    title: "",
  });

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;
      
      setIsFetching(true);
      try {
        const res = await api.get(`/events/slug/${slug}`);
        const event: EventData = res.data.data;
        
        setEventId(event.id);
        setFormData({
          title: event.title || "",
          description: event.description || "",
          location: event.location || "",
          quota: event.quota?.toString() || "",
          price: event.price?.toString() || "0",
          event_type: event.event_type || "offline",
          status: event.status || "draft",
          category: event.category || "",
          start_date: event.start_date ? event.start_date.split("T")[0] : "",
          end_date: event.end_date ? event.end_date.split("T")[0] : "",
          registration_deadline: event.registration_deadline 
            ? `${event.registration_deadline.split("T")[0]} ${event.registration_deadline.split("T")[1]?.substring(0, 5) || "23:59"}` 
            : "",
        });
        setCurrentBanner(event.banner || "");
        
        // Parse speakers from JSON
        if (event.speakers) {
          try {
            const parsedSpeakers = JSON.parse(event.speakers);
            setSpeakers(parsedSpeakers);
          } catch (e) {
            console.error("Failed to parse speakers:", e);
          }
        }
      } catch (error: any) {
        console.error("Gagal mengambil data event:", error);
        if (error.response?.status === 403) {
          toast.error("Anda tidak memiliki akses untuk mengedit event ini");
          navigate("/dashboard");
        } else {
          toast.error("Gagal mengambil data event");
        }
      } finally {
        setIsFetching(false);
      }
    };

    fetchEvent();
  }, [slug, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBannerFile(e.target.files[0]);
    }
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
    
    if (!eventId) {
      toast.error("Event ID tidak ditemukan");
      return;
    }

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
      
      // Kirim registration_deadline jika diisi, atau clear jika kosong
      if (formData.registration_deadline) {
        data.append("registration_deadline", formData.registration_deadline);
      } else {
        data.append("clear_registration_deadline", "true");
      }
      
      if (bannerFile) {
        data.append("banner", bannerFile);
      }

      // Kirim speakers sebagai JSON string
      if (speakers.length > 0) {
        data.append("speakers", JSON.stringify(speakers));
      } else {
        data.append("speakers", "[]");
      }

      await api.put(`/events/${eventId}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Event berhasil diupdate!");
      navigate(`/dashboard/event/${slug}`);
    } catch (error: any) {
      console.error("Gagal mengupdate event:", error);
      if (error.response?.status === 403) {
        toast.error("Anda tidak memiliki akses untuk mengedit event ini");
      } else {
        toast.error("Terjadi kesalahan saat mengupdate event");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <SidebarProvider>
        <SidebarLeft />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </SidebarInset>
        <SidebarRight />
      </SidebarProvider>
    );
  }

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
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/dashboard/event/${slug}`}>{formData.title}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit Event</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 max-w-3xl mx-auto w-full">
          <Button
            variant="ghost"
            onClick={() => navigate(`/dashboard/event/${slug}`)}
            className="w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Detail Event
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Edit Event</CardTitle>
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

                {/* Current Banner Preview */}
                {currentBanner && (
                  <div className="space-y-2">
                    <Label>Banner Saat Ini</Label>
                    <img
                      src={currentBanner}
                      alt="Current banner"
                      className="w-full max-h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}

                {/* Banner Upload */}
                <div className="space-y-2">
                  <Label htmlFor="banner">Ganti Banner Event</Label>
                  <Input id="banner" type="file" onChange={handleFileChange} accept="image/*" />
                  <p className="text-xs text-muted-foreground">
                    Kosongkan jika tidak ingin mengubah banner
                  </p>
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
                    rows={5}
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
                      value={formData.status}
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
                  <Button type="button" variant="outline" onClick={() => navigate(`/dashboard/event/${slug}`)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Perubahan
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
