import { useEffect, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { TicketPrint } from "@/components/TicketPrint";
import api from "../../services/api";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Printer, Ticket, Award, CreditCard, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Type declaration untuk Midtrans Snap
declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface MyTicket {
  id: number;
  status: string;
  qr_code: string;
  attendance_proof_url?: string;
  certificate_url?: string;
  email_sent?: boolean;
  event: {
    title: string;
    slug: string;
    location: string;
    start_date: string;
    event_type?: string;
    price?: number;
  };
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedTicketForCheckIn, setSelectedTicketForCheckIn] = useState<MyTicket | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingCheckIn, setUploadingCheckIn] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedTicket
      ? `Tiket-${selectedTicket.event.title}`
      : "Tiket-Event",
  });

  const onPrintClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get("/user/registrations");
      // Pastikan selalu set array, bahkan jika response.data.data null/undefined
      setTickets(response.data?.data || []);
    } catch (error) {
      console.error("Gagal load tiket:", error);
      // Set empty array jika error terjadi
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (ticketId: number) => {
    // Cek apakah Snap.js sudah loaded
    if (typeof window.snap === "undefined") {
      toast.error("Payment gateway belum siap. Silakan refresh halaman.");
      return;
    }

    setProcessingPayment(ticketId);

    try {
      // Panggil API untuk initiate payment
      const response = await api.post(`/payment/initiate/${ticketId}`);
      
      if (response.data.success && response.data.data?.token) {
        const token = response.data.data.token;

        // Buka Snap popup
        window.snap.pay(token, {
          onSuccess: async (result: any) => {
            console.log("Payment success:", result);
            toast.success("Pembayaran berhasil! Mengecek status pembayaran...");
            
            // Langsung check status pembayaran setelah sukses
            try {
              const checkResponse = await api.get(`/payment/status/${ticketId}`);
              if (checkResponse.data.success) {
                if (checkResponse.data.data?.updated) {
                  toast.success("Status pembayaran berhasil diupdate!");
                }
                // Reload tickets
                setTimeout(() => {
                  fetchTickets();
                }, 1000);
              }
            } catch (checkError) {
              console.error("Error checking payment status:", checkError);
              // Tetap reload untuk memastikan data ter-update
              setTimeout(() => {
                fetchTickets();
              }, 2000);
            }
          },
          onPending: async (result: any) => {
            console.log("Payment pending:", result);
            toast.info("Pembayaran sedang diproses. Mengecek status...");
            
            // Check status untuk pending juga
            try {
              await api.get(`/payment/status/${ticketId}`);
              setTimeout(() => {
                fetchTickets();
              }, 1000);
            } catch (checkError) {
              console.error("Error checking payment status:", checkError);
            }
          },
          onError: (result: any) => {
            console.error("Payment error:", result);
            toast.error("Pembayaran gagal. Silakan coba lagi.");
          },
          onClose: () => {
            console.log("Payment popup ditutup");
            toast.info("Pembayaran dibatalkan.");
          },
        });
      } else {
        toast.error(response.data.message || "Gagal membuat token pembayaran");
      }
    } catch (error: any) {
      console.error("Error initiating payment:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Gagal memulai pembayaran. Silakan coba lagi.");
      }
    } finally {
      setProcessingPayment(null);
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
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Tiket Saya</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Tiket Saya</h1>
            <Badge variant="outline">{tickets?.length || 0} Event Diikuti</Badge>
          </div>
          <div
            style={{ position: "absolute", top: "-9999px", left: "-9999px" }}
          >
            <TicketPrint ref={printRef} data={selectedTicket} />
          </div>
          {loading ? (
            <div className="text-center p-10 text-muted-foreground">
              Memuat tiket...
            </div>
          ) : !tickets || tickets.length === 0 ? (
            <div className="text-center border border-dashed rounded-lg p-10 bg-muted/20">
              <Ticket className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">Belum ada tiket</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Kamu belum mendaftar ke event apapun.
              </p>
              <Button asChild>
                <Link to="/dashboard">Cari Event</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="flex flex-col overflow-hidden border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-all"
                >
                  <CardHeader className="pb-3 bg-slate-50/50 border-b">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <CardTitle className="line-clamp-1 text-base">
                          {ticket.event.title}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono">
                          ID: {ticket.qr_code.substring(0, 15)}...
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          ticket.status === "confirmed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 py-6 space-y-6">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {ticket.event?.event_type === "online" ? (
                        <>
                          <div className="p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl border-2 border-purple-300">
                            <p className="text-lg font-bold text-purple-700 text-center">Event Online</p>
                            <p className="text-sm text-purple-600 text-center mt-1">Tidak perlu QR Code</p>
                          </div>
                          <p className="text-xs text-blue-600 font-medium text-center">
                            Gunakan tombol "Konfirmasi Kehadiran" di bawah untuk check-in
                          </p>
                        </>
                      ) : ticket.event?.event_type === "hybrid" ? (
                        <>
                          <div className="p-3 bg-white rounded-xl border-2 border-dashed border-gray-300">
                            <QRCode value={ticket.qr_code} size={120} level="M" />
                          </div>
                          <div className="p-3 bg-gradient-to-br from-green-50 to-purple-50 rounded-lg border border-green-200">
                            <p className="text-xs font-bold text-green-700 text-center">🎯 Event Hybrid</p>
                            <p className="text-[10px] text-gray-600 text-center mt-1">
                              Scan QR (offline) ATAU gunakan tombol konfirmasi (online)
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-white rounded-xl border-2 border-dashed border-gray-300">
                            <QRCode value={ticket.qr_code} size={120} level="M" />
                          </div>
                          <p className="text-[10px] text-muted-foreground text-center">
                            Tunjukkan QR ini ke panitia untuk check-in
                          </p>
                        </>
                      )}
                    </div>

                    <Separator />

                    {/* Info Event */}
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>
                          {new Date(ticket.event.start_date).toLocaleDateString(
                            "id-ID",
                            {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="line-clamp-2">
                          {ticket.event.location}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex flex-col gap-2">
                    {/* Status Pending - Tampilkan pesan untuk event gratis, atau tombol bayar untuk event berbayar */}
                    {ticket.status === "pending" && (
                      <>
                        {ticket.event?.price === 0 || ticket.event?.price === null ? (
                          <div className="w-full bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 text-center">
                            ⏳ Pendaftaran Anda sedang menunggu approval dari panitia. Anda akan mendapat notifikasi setelah disetujui.
                          </div>
                        ) : (
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handlePayment(ticket.id)}
                            disabled={processingPayment === ticket.id}
                          >
                            {processingPayment === ticket.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Memproses...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Bayar Sekarang
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}

                    {/* Self Check-in untuk Event Online dan Hybrid (hanya jika status confirmed) */}
                    {(ticket.event?.event_type === "online" || ticket.event?.event_type === "hybrid") && 
                     ticket.status === "confirmed" && (
                      <Dialog open={checkInDialogOpen && selectedTicketForCheckIn?.id === ticket.id} onOpenChange={(open) => {
                        setCheckInDialogOpen(open);
                        if (open) {
                          setSelectedTicketForCheckIn(ticket);
                        } else {
                          setSelectedTicketForCheckIn(null);
                          setProofFile(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() => {
                              setSelectedTicketForCheckIn(ticket);
                              setCheckInDialogOpen(true);
                            }}
                          >
                            ✓ Konfirmasi Kehadiran {ticket.event?.event_type === "hybrid" ? "(Online)" : "(Event Online)"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Konfirmasi Kehadiran - {ticket.event?.event_type === "hybrid" ? "Mode Online" : "Event Online"}</DialogTitle>
                            <DialogDescription>
                              Silakan upload bukti kehadiran Anda (screenshot Zoom, foto, dll) untuk konfirmasi kehadiran.
                              {ticket.event?.event_type === "hybrid" && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠️ Event hybrid: Jika hadir langsung, gunakan scan QR oleh panitia.
                                </span>
                              )}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="proof">Bukti Kehadiran (Screenshot Zoom, Foto, dll)</Label>
                              <Input
                                id="proof"
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setProofFile(e.target.files[0]);
                                  }
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                Format: JPG, PNG, GIF, PDF. Maksimal 5MB.
                              </p>
                              {proofFile && (
                                <p className="text-sm text-green-600">
                                  ✓ File dipilih: {proofFile.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCheckInDialogOpen(false);
                                setSelectedTicketForCheckIn(null);
                                setProofFile(null);
                              }}
                              disabled={uploadingCheckIn}
                            >
                              Batal
                            </Button>
                            <Button
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={async () => {
                                if (!selectedTicketForCheckIn) return;
                                
                                if (!proofFile) {
                                  toast.error("Silakan pilih bukti kehadiran terlebih dahulu.");
                                  return;
                                }

                                setUploadingCheckIn(true);
                                try {
                                  const formData = new FormData();
                                  formData.append("token", selectedTicketForCheckIn.qr_code);
                                  formData.append("proof", proofFile);

                                  await api.post("/check-in/self", formData, {
                                    headers: {
                                      "Content-Type": "multipart/form-data",
                                    },
                                  });
                                  
                                  toast.success("Kehadiran berhasil dikonfirmasi! Terima kasih sudah hadir.");
                                  setCheckInDialogOpen(false);
                                  setSelectedTicketForCheckIn(null);
                                  setProofFile(null);
                                  fetchTickets(); // Refresh list
                                } catch (error: any) {
                                  toast.error(error.response?.data?.message || "Gagal konfirmasi kehadiran");
                                } finally {
                                  setUploadingCheckIn(false);
                                }
                              }}
                              disabled={uploadingCheckIn || !proofFile}
                            >
                              {uploadingCheckIn ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Mengupload...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Konfirmasi Kehadiran
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Badge jika sudah check-in untuk event online */}
                    {ticket.event?.event_type === "online" && ticket.status === "checked_in" && (
                      <Badge variant="default" className="w-full justify-center bg-green-600">
                        ✓ Sudah Konfirmasi Kehadiran
                      </Badge>
                    )}
                    <div className="flex gap-2 w-full">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to={`/event/${ticket.event.slug}`}>Detail</Link>
                      </Button>
                      {ticket.status === "confirmed" && (
                        <Button onClick={() => onPrintClick(ticket)}>
                          <Printer className="w-4 h-4 mr-2" />
                          Cetak
                        </Button>
                      )}
                    </div>
                    {ticket.status === "checked_in" && ticket.certificate_url && (
                      <>
                        <Button
                          variant="default"
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            window.open(ticket.certificate_url, "_blank");
                          }}
                        >
                          <Award className="w-4 h-4 mr-2" />
                          Lihat Sertifikat
                        </Button>
                        {ticket.email_sent && (
                          <div className="w-full bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800 text-center">
                            ✅ Sertifikat sudah dikirim ke email Anda
                          </div>
                        )}
                        {!ticket.email_sent && (
                          <div className="w-full bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800 text-center">
                            ⏳ Sertifikat belum dikirim via email. Hubungi panitia jika diperlukan.
                          </div>
                        )}
                      </>
                    )}
                    {ticket.status === "checked_in" && !ticket.certificate_url && (
                      <div className="w-full bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800 text-center">
                        Sertifikat belum diupload oleh panitia. Hubungi panitia untuk upload sertifikat.
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
