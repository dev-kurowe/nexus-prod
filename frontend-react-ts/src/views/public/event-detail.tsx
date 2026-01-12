import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Cookies from "js-cookie";
import api from "../../services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Loader2, LogIn, CheckCircle, Users, AlertCircle, Wallet, Mic, Clock } from "lucide-react";

export default function PublicEventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isLoggedIn = !!Cookies.get("token");

  const [event, setEvent] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isRegistered, setIsRegistered] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Cek apakah pendaftaran sudah melewati deadline
  const isRegistrationClosed = (): boolean => {
    if (!event?.registration_deadline) return false;
    const deadline = new Date(event.registration_deadline);
    // Set deadline ke akhir hari (23:59:59)
    deadline.setHours(23, 59, 59, 999);
    return new Date() > deadline;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventRes = await api.get(`/events/slug/${slug}`);
        const eventData = eventRes.data.data;
        setEvent(eventData);
        if (eventData.id) {
          const formRes = await api.get(`/forms/event/${eventData.id}`);
          setFormFields(formRes.data.data);
          
          // Cek status pendaftaran jika user sudah login
          if (isLoggedIn) {
            try {
              const regStatusRes = await api.get(`/registration-status/event/${eventData.id}`);
              if (regStatusRes.data.registered) {
                setIsRegistered(true);
              }
            } catch (error) {
              // User belum terdaftar atau error, tidak apa-apa
              console.log("User belum terdaftar");
            }
          }
        }
      } catch (error) {
        console.error("Event not found", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, isLoggedIn]);

  const handleInputChange = (fieldId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validasi hanya field yang terlihat (termasuk conditional yang sudah muncul)
    const visibleFields = formFields.filter((field) => {
      if (!field.parent_field_id) {
        return true;
      }
      const parentAnswer = answers[field.parent_field_id.toString()];
      return parentAnswer === field.conditional_value;
    });
    
    visibleFields.forEach((field) => {
      if (field.is_required) {
        const value = answers[field.id.toString()];
        if (!value || value.trim() === "") {
          errors[field.id.toString()] = `${field.label} wajib diisi`;
        }
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return navigate("/");

    // Validasi form
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        answers: Object.entries(answers).map(([key, val]) => ({
          form_field_id: parseInt(key),
          value: val,
        })),
      };

      const response = await api.post(`/participant/event/${event.id}/register`, payload);
      const data = response.data;

      // Handle event gratis vs berbayar
      if (data.is_free) {
        // Event GRATIS: Tampilkan sukses, perlu approval panitia
        setSuccess(true);
        setIsRegistered(true);
        window.scrollTo(0, 0);
      } else {
        // Event BERBAYAR: Redirect ke Midtrans payment
        if (data.payment && data.payment.redirect_url) {
          // Redirect ke halaman pembayaran Midtrans
          window.location.href = data.payment.redirect_url;
        } else {
          toast.error("Pendaftaran berhasil, namun terjadi kesalahan pada pembayaran. Silakan hubungi panitia.");
          setSuccess(true);
          setIsRegistered(true);
        }
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Gagal mendaftar.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };
  

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!event)
    return <div className="text-center py-20">Event tidak ditemukan.</div>;
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              Pendaftaran Berhasil!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {event.price === 0 || event.price === null ? (
                <>
                  Terima kasih telah mendaftar di event <strong>{event.title}</strong>. 
                  Pendaftaran Anda sedang menunggu approval dari panitia. Tiket dan detail lainnya 
                  dapat dilihat di dashboard user setelah disetujui.
                </>
              ) : (
                <>
                  Terima kasih telah mendaftar di event <strong>{event.title}</strong>. 
                  Silakan selesaikan pembayaran untuk menyelesaikan pendaftaran. 
                  Tiket dan detail lainnya dapat dilihat di dashboard user setelah pembayaran berhasil.
                </>
              )}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate("/dashboard")}>
                Ke Dashboard Saya
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Kembali ke Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO SECTION (Banner) */}
      <div className="relative h-[300px] md:h-[400px] w-full bg-gray-200">
        {event.banner ? (
          <img
            src={event.banner}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            No Banner
          </div>
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 left-0 p-6 md:p-12 text-white container mx-auto">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge className="bg-blue-600 hover:bg-blue-700">
              {event.status}
            </Badge>
            {event.category && (
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                {event.category}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-2">{event.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm md:text-base opacity-90">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />{" "}
              {new Date(event.start_date).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {event.location}
            </div>
            {event.price !== undefined && (
              <div className="flex items-center gap-1">
                <Wallet className="w-4 h-4" />{" "}
                {event.price === 0 || event.price === null ? "Gratis" : `Rp ${event.price.toLocaleString('id-ID')}`}
              </div>
            )}
            {event.registration_deadline && (
              <div className={`flex items-center gap-1 ${isRegistrationClosed() ? 'text-red-300' : ''}`}>
                <Clock className="w-4 h-4" />{" "}
                Daftar s.d. {new Date(event.registration_deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}{" "}
                pukul {new Date(event.registration_deadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </div>
            )}
          </div>
        </div>
      </div>

        <div className="container mx-auto px-4 py-8 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Tentang Event</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Narasumber / Pembicara */}
          {event.speakers && (() => {
            try {
              const speakersList = JSON.parse(event.speakers);
              if (speakersList && speakersList.length > 0) {
                return (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-purple-600" />
                      Narasumber / Pembicara
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {speakersList.map((speaker: { id: string; name: string; title: string }, index: number) => (
                        <Card key={speaker.id || index} className="border-l-4 border-l-purple-500">
                          <CardContent className="pt-4">
                            <h3 className="font-semibold text-lg">{speaker.name}</h3>
                            <p className="text-sm text-muted-foreground">{speaker.title}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              }
            } catch (e) {
              // Invalid JSON, skip rendering
            }
            return null;
          })()}
          
          {/* Info Kuota & Harga */}
          <div className="space-y-4">
            {/* Info Harga */}
            {event.price !== undefined && (
              <Card className={event.price === 0 || event.price === null ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Wallet className={`w-5 h-5 ${event.price === 0 || event.price === null ? "text-green-600" : "text-orange-600"}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${event.price === 0 || event.price === null ? "text-green-900" : "text-orange-900"}`}>
                        Harga Event
                      </p>
                      <p className={`text-lg font-bold ${event.price === 0 || event.price === null ? "text-green-700" : "text-orange-700"}`}>
                        {event.price === 0 || event.price === null 
                          ? "GRATIS" 
                          : `Rp ${event.price.toLocaleString('id-ID')}`}
                      </p>
                      <p className={`text-xs ${event.price === 0 || event.price === null ? "text-green-700" : "text-orange-700"}`}>
                        {event.price === 0 || event.price === null 
                          ? "Pendaftaran perlu approval dari panitia" 
                          : "Pembayaran via Midtrans (auto-approve setelah pembayaran)"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Kuota */}
            {event.quota > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        Kuota Pendaftaran
                      </p>
                      <p className="text-xs text-blue-700">
                        {event.registered_count || 0} dari {event.quota} peserta
                        {event.available_quota !== undefined && event.available_quota >= 0 && (
                          <span className="ml-2 font-semibold">
                            ({event.available_quota} tersisa)
                          </span>
                        )}
                      </p>
                    </div>
                    {event.available_quota !== undefined && event.available_quota === 0 && (
                      <Badge variant="destructive">Penuh</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Tenggat Pendaftaran */}
            {event.registration_deadline && (
              <Card className={isRegistrationClosed() ? "bg-red-50 border-red-200" : "bg-purple-50 border-purple-200"}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className={`w-5 h-5 ${isRegistrationClosed() ? "text-red-600" : "text-purple-600"}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isRegistrationClosed() ? "text-red-900" : "text-purple-900"}`}>
                        Batas Waktu Pendaftaran
                      </p>
                      <p className={`text-lg font-bold ${isRegistrationClosed() ? "text-red-700" : "text-purple-700"}`}>
                        {new Date(event.registration_deadline).toLocaleDateString('id-ID', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}{" "}
                        pukul {new Date(event.registration_deadline).toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} WIB
                      </p>
                      <p className={`text-xs ${isRegistrationClosed() ? "text-red-700" : "text-purple-700"}`}>
                        {isRegistrationClosed() 
                          ? "Pendaftaran sudah ditutup" 
                          : "Daftar sebelum batas waktu berakhir"}
                      </p>
                    </div>
                    {isRegistrationClosed() && (
                      <Badge variant="destructive">Ditutup</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <div>
          <Card className="sticky top-8 shadow-lg border-t-4 border-t-blue-600">
            <CardHeader>
              <CardTitle>Formulir Pendaftaran</CardTitle>
            </CardHeader>
            <CardContent>
              {!isLoggedIn ? (
                <div className="text-center py-6 space-y-4">
                  <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm">
                    Anda harus login untuk mendaftar event ini.
                  </div>
                  <Button className="w-full" onClick={() => navigate("/login")}>
                    <LogIn className="mr-2 w-4 h-4" /> Login Sekarang
                  </Button>
                </div>
              ) : isRegistered ? (
                <div className="text-center py-6 space-y-4">
                  <div className="bg-green-50 text-green-800 p-4 rounded-md">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <p className="font-semibold mb-1">Anda sudah terdaftar!</p>
                    <p className="text-sm">
                      Tiket Anda dapat dilihat di halaman{" "}
                      <Link to="/my-tickets" className="underline font-medium">
                        Tiket Saya
                      </Link>
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/my-tickets">Lihat Tiket Saya</Link>
                  </Button>
                </div>
              ) : event.status !== "published" ? (
                <div className="text-center py-6 space-y-4">
                  <div className="bg-gray-50 text-gray-800 p-4 rounded-md">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <p className="font-semibold mb-1">Pendaftaran Belum Dibuka</p>
                    <p className="text-sm">
                      Event ini masih dalam status: <strong>{event.status}</strong>
                    </p>
                  </div>
                </div>
              ) : event.available_quota !== undefined && event.available_quota === 0 ? (
                <div className="text-center py-6 space-y-4">
                  <div className="bg-red-50 text-red-800 p-4 rounded-md">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                    <p className="font-semibold mb-1">Kuota Sudah Penuh</p>
                    <p className="text-sm">
                      Maaf, kuota untuk event ini sudah penuh.
                    </p>
                  </div>
                </div>
              ) : isRegistrationClosed() ? (
                <div className="text-center py-6 space-y-4">
                  <div className="bg-orange-50 text-orange-800 p-4 rounded-md">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                    <p className="font-semibold mb-1">Pendaftaran Ditutup</p>
                    <p className="text-sm">
                      Maaf, batas waktu pendaftaran sudah berakhir pada{" "}
                      <strong>
                        {new Date(event.registration_deadline).toLocaleDateString('id-ID', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}{" "}
                        pukul {new Date(event.registration_deadline).toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} WIB
                      </strong>
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {formFields
                    .filter((field) => {
                      // Tampilkan field jika:
                      // 1. Tidak ada parent_field_id (field biasa/non-conditional)
                      // 2. Ada parent_field_id tapi jawaban parent sudah sesuai conditional_value
                      if (!field.parent_field_id) {
                        return true;
                      }
                      // Field conditional - cek apakah parent field sudah dijawab dengan nilai yang sesuai
                      const parentAnswer = answers[field.parent_field_id.toString()];
                      return parentAnswer === field.conditional_value;
                    })
                    .map((field) => (
                    <div 
                      key={field.id} 
                      className={`space-y-2 transition-all duration-300 ${
                        field.parent_field_id 
                          ? "border-l-4 border-blue-500 pl-4 bg-blue-50 dark:bg-blue-950/20 rounded-r" 
                          : ""
                      }`}
                    >
                      {field.parent_field_id && (
                        <p className="text-xs text-muted-foreground italic">
                          Pertanyaan lanjutan
                        </p>
                      )}
                      <Label>
                        {field.label}
                        {field.is_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      {field.field_type === "text" ||
                      field.field_type === "number" ||
                      field.field_type === "date" ? (
                        <div>
                          <Input
                            type={field.field_type}
                            required={field.is_required}
                            value={answers[field.id.toString()] || ""}
                            onChange={(e) => {
                              handleInputChange(field.id, e.target.value);
                              // Hapus error saat user mulai mengetik
                              if (formErrors[field.id.toString()]) {
                                setFormErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors[field.id.toString()];
                                  return newErrors;
                                });
                              }
                            }}
                            className={formErrors[field.id.toString()] ? "border-red-500" : ""}
                          />
                          {formErrors[field.id.toString()] && (
                            <p className="text-xs text-red-500 mt-1">
                              {formErrors[field.id.toString()]}
                            </p>
                          )}
                        </div>
                      ) : field.field_type === "select" ? (
                        <div>
                          <Select
                            onValueChange={(val) => {
                              handleInputChange(field.id, val);
                              // Jika ini adalah parent field, hapus jawaban conditional fields yang tidak relevan
                              const childFields = formFields.filter(f => f.parent_field_id === field.id);
                              childFields.forEach(childField => {
                                if (val !== childField.conditional_value) {
                                  // Hapus jawaban child field jika conditional tidak terpenuhi
                                  setAnswers((prev) => {
                                    const newAnswers = { ...prev };
                                    delete newAnswers[childField.id.toString()];
                                    return newAnswers;
                                  });
                                  // Hapus error child field juga
                                  setFormErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors[childField.id.toString()];
                                    return newErrors;
                                  });
                                }
                              });
                              // Hapus error saat user memilih
                              if (formErrors[field.id.toString()]) {
                                setFormErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors[field.id.toString()];
                                  return newErrors;
                                });
                              }
                            }}
                            required={field.is_required}
                            value={answers[field.id.toString()] || ""}
                          >
                            <SelectTrigger className={formErrors[field.id.toString()] ? "border-red-500" : ""}>
                              <SelectValue placeholder="Pilih..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                try {
                                  const opts =
                                    typeof field.options === "string"
                                      ? JSON.parse(field.options)
                                      : field.options;
                                  return Array.isArray(opts)
                                    ? opts.map((opt: string) => (
                                        <SelectItem key={opt} value={opt}>
                                          {opt}
                                        </SelectItem>
                                      ))
                                    : null;
                                } catch (e) {
                                  return null;
                                }
                              })()}
                            </SelectContent>
                          </Select>
                          {formErrors[field.id.toString()] && (
                            <p className="text-xs text-red-500 mt-1">
                              {formErrors[field.id.toString()]}
                            </p>
                          )}
                        </div>
                      ) : field.field_type === "file" ? (
                        <div className="border border-dashed p-4 rounded-md text-center bg-gray-50 text-xs text-muted-foreground">
                          Fitur Upload File (Coming Soon)
                        </div>
                      ) : null}
                    </div>
                  ))}

                  {formFields.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      Cukup klik daftar, tidak ada data tambahan yang
                      diperlukan.
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={submitting}
                  >
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Daftar Sekarang
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
