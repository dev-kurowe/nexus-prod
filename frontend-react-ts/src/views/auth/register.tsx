import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUniversities, getFaculties, getStudyPrograms } from "@/services/masterService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Form, Step 2: Verification
  const [isLoading, setIsLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    isBukanMahasiswa: false, // Default adalah mahasiswa
    universityId: "",
    facultyId: "",
    studyProgramId: "",
    angkatan: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown dalam detik
  const [universities, setUniversities] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<any[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingStudyPrograms, setLoadingStudyPrograms] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nama lengkap wajib diisi";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username wajib diisi";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username minimal 3 karakter";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }

    if (!formData.password) {
      newErrors.password = "Password wajib diisi";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password minimal 6 karakter";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password wajib diisi";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Password tidak sama";
    }

    // Validasi data akademik wajib untuk mahasiswa
    if (!formData.isBukanMahasiswa) {
      if (!formData.universityId) {
        newErrors.universityId = "Universitas wajib dipilih";
      }
      if (!formData.facultyId) {
        newErrors.facultyId = "Fakultas wajib dipilih";
      }
      if (!formData.studyProgramId) {
        newErrors.studyProgramId = "Program Studi wajib dipilih";
      }
      if (!formData.angkatan) {
        newErrors.angkatan = "Angkatan wajib dipilih";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Effect untuk countdown cooldown resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Load universities on mount (default is mahasiswa)
  useEffect(() => {
    if (!formData.isBukanMahasiswa && universities.length === 0) {
      setLoadingUniversities(true);
      getUniversities(true) // Use public endpoint (no auth required)
        .then((response) => {
          const data = Array.isArray(response) ? response : (response?.data || []);
          setUniversities(data);
        })
        .catch(() => toast.error("Gagal memuat daftar universitas"))
        .finally(() => setLoadingUniversities(false));
    }
  }, [formData.isBukanMahasiswa]);

  // Load faculties when university is selected
  useEffect(() => {
    if (formData.universityId) {
      setLoadingFaculties(true);
      setFaculties([]);
      setFormData(prev => ({ ...prev, facultyId: "", studyProgramId: "" }));
      getFaculties(true)
        .then((response) => {
          const data = Array.isArray(response) ? response : (response?.data || []);
          // Filter by university_id
          const filtered = data.filter((f: any) => f.university_id === parseInt(formData.universityId));
          setFaculties(filtered);
        })
        .catch(() => toast.error("Gagal memuat daftar fakultas"))
        .finally(() => setLoadingFaculties(false));
    }
  }, [formData.universityId]);

  // Load study programs when faculty is selected
  useEffect(() => {
    if (formData.facultyId) {
      setLoadingStudyPrograms(true);
      setStudyPrograms([]);
      setFormData(prev => ({ ...prev, studyProgramId: "" }));
      getStudyPrograms(true)
        .then((response) => {
          const data = Array.isArray(response) ? response : (response?.data || []);
          // Filter by faculty_id
          const filtered = data.filter((sp: any) => sp.faculty_id === parseInt(formData.facultyId));
          setStudyPrograms(filtered);
        })
        .catch(() => toast.error("Gagal memuat daftar program studi"))
        .finally(() => setLoadingStudyPrograms(false));
    }
  }, [formData.facultyId]);

  // Fungsi untuk mengirim kode verifikasi (bisa dipanggil dari form submit atau resend)
  const sendVerificationCode = async () => {
    // Cek cooldown
    if (resendCooldown > 0) {
      toast.error(`Tunggu ${resendCooldown} detik sebelum kirim ulang`);
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
      };

      // Tambahkan data mahasiswa jika bukan "bukan mahasiswa" (artinya mahasiswa)
      if (!formData.isBukanMahasiswa) {
        if (formData.universityId) {
          payload.university_id = parseInt(formData.universityId);
        }
        if (formData.facultyId) {
          payload.faculty_id = parseInt(formData.facultyId);
        }
        if (formData.studyProgramId) {
          payload.study_program_id = parseInt(formData.studyProgramId);
        }
        if (formData.angkatan) {
          payload.angkatan = formData.angkatan;
        }
      }

      const response = await api.post("/register/send-verification", payload);

      if (response.data.success) {
        setVerificationEmail(formData.email.trim());
        if (step === 1) {
          setStep(2);
        }
        // Set cooldown 1 menit (60 detik)
        setResendCooldown(60);
        toast.success("Kode verifikasi telah dikirim ke email Anda!");
      } else {
        toast.error(response.data.message || "Gagal mengirim kode verifikasi");
      }
    } catch (error: any) {
      console.error("Send Verification Error:", error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors
        if (errorData.errors && typeof errorData.errors === "object") {
          const errorMessages = Object.values(errorData.errors).flat();
          toast.error(errorMessages.join(", ") || "Terjadi kesalahan validasi");
        } else if (errorData.message) {
          toast.error(errorData.message);
        } else {
          toast.error("Gagal mengirim kode verifikasi. Silakan coba lagi.");
        }
      } else if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        toast.error("Tidak dapat terhubung ke server. Pastikan backend server sudah berjalan di http://localhost:8000");
      } else {
        toast.error("Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Kirim kode verifikasi
  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Mohon perbaiki kesalahan pada form");
      return;
    }

    await sendVerificationCode();
  };

  // Step 2: Verifikasi kode dan buat akun
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      toast.error("Masukkan kode verifikasi");
      return;
    }

    if (verificationCode.trim().length !== 6) {
      toast.error("Kode verifikasi harus 6 digit");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/register/verify", {
        email: verificationEmail,
        code: verificationCode.trim(),
      });

      if (response.data.success) {
        toast.success("Registrasi berhasil! Silakan login.");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        toast.error(response.data.message || "Verifikasi gagal");
      }
    } catch (error: any) {
      console.error("Verify Error:", error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.errors && typeof errorData.errors === "object") {
          const errorMessages = Object.values(errorData.errors).flat();
          toast.error(errorMessages.join(", ") || "Terjadi kesalahan");
        } else if (errorData.message) {
          toast.error(errorData.message);
        } else {
          toast.error("Verifikasi gagal. Silakan coba lagi.");
        }
      } else if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        toast.error("Tidak dapat terhubung ke server. Pastikan backend server sudah berjalan di http://localhost:8000");
      } else {
        toast.error("Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {step === 1 ? "Buat Akun Baru" : "Verifikasi Email"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Masukkan informasi Anda untuk membuat akun"
              : "Masukkan kode verifikasi yang telah dikirim ke email Anda"}
          </CardDescription>
        </CardHeader>

        {step === 1 ? (
          <form onSubmit={handleSendVerification}>
            <CardContent className="space-y-4">
            {/* Nama Lengkap */}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                required
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="johndoe"
                required
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimal 6 karakter"
                required
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Konfirmasi Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Ulangi password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Nomor HP */}
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor HP <span className="text-muted-foreground">(Opsional)</span></Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            {/* Data Akademik (hanya muncul jika mahasiswa - tidak centang bukan mahasiswa) */}
            {!formData.isBukanMahasiswa && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm font-medium">Data Akademik <span className="text-red-500">*</span></p>
                
                {/* Universitas */}
                <div className="space-y-2">
                  <Label>Universitas <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.universityId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, universityId: value })
                    }
                    disabled={isLoading || loadingUniversities}
                  >
                    <SelectTrigger className={errors.universityId ? "border-red-500" : ""}>
                      <SelectValue placeholder={loadingUniversities ? "Memuat..." : "Pilih Universitas"} />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map((uni) => (
                        <SelectItem key={uni.id} value={String(uni.id)}>
                          {uni.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.universityId && (
                    <p className="text-sm text-red-500">{errors.universityId}</p>
                  )}
                </div>

                {/* Fakultas */}
                <div className="space-y-2">
                  <Label>Fakultas <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.facultyId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, facultyId: value })
                    }
                    disabled={isLoading || loadingFaculties || !formData.universityId}
                  >
                    <SelectTrigger className={errors.facultyId ? "border-red-500" : ""}>
                      <SelectValue placeholder={
                        !formData.universityId ? "Pilih Universitas dulu" :
                        loadingFaculties ? "Memuat..." : "Pilih Fakultas"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {faculties.map((fac) => (
                        <SelectItem key={fac.id} value={String(fac.id)}>
                          {fac.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.facultyId && (
                    <p className="text-sm text-red-500">{errors.facultyId}</p>
                  )}
                </div>

                {/* Program Studi */}
                <div className="space-y-2">
                  <Label>Program Studi <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.studyProgramId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, studyProgramId: value })
                    }
                    disabled={isLoading || loadingStudyPrograms || !formData.facultyId}
                  >
                    <SelectTrigger className={errors.studyProgramId ? "border-red-500" : ""}>
                      <SelectValue placeholder={
                        !formData.facultyId ? "Pilih Fakultas dulu" :
                        loadingStudyPrograms ? "Memuat..." : "Pilih Program Studi"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {studyPrograms.map((sp) => (
                        <SelectItem key={sp.id} value={String(sp.id)}>
                          {sp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.studyProgramId && (
                    <p className="text-sm text-red-500">{errors.studyProgramId}</p>
                  )}
                </div>

                {/* Angkatan */}
                <div className="space-y-2">
                  <Label>Angkatan <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.angkatan}
                    onValueChange={(value) =>
                      setFormData({ ...formData, angkatan: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className={errors.angkatan ? "border-red-500" : ""}>
                      <SelectValue placeholder="Pilih Angkatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {errors.angkatan && (
                    <p className="text-sm text-red-500">{errors.angkatan}</p>
                  )}
                </div>
              </div>
            )}

            {/* Checkbox Bukan Mahasiswa - di bawah data akademik */}
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="isBukanMahasiswa"
                checked={formData.isBukanMahasiswa}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isBukanMahasiswa: checked === true })
                }
                disabled={isLoading}
              />
              <Label htmlFor="isBukanMahasiswa" className="cursor-pointer">
                Saya bukan Mahasiswa
              </Label>
            </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Mengirim kode..." : "Kirim Kode Verifikasi"}
              </Button>

              <div className="text-sm text-center text-muted-foreground">
                Sudah punya akun?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Login di sini
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister}>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <Mail className="w-4 h-4" />
                  <p className="text-sm font-medium">
                    Kode verifikasi telah dikirim ke:
                  </p>
                </div>
                <p className="text-sm text-blue-600 mt-1 font-mono">
                  {verificationEmail}
                </p>
                <p className="text-xs text-blue-500 mt-2">
                  Kode berlaku selama 5 menit. Periksa folder spam jika tidak
                  menemukan email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verificationCode">Kode Verifikasi</Label>
                <Input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  placeholder="Masukkan 6 digit kode"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ""); // Hanya angka
                    setVerificationCode(value);
                    if (errors.verificationCode) {
                      setErrors({ ...errors, verificationCode: "" });
                    }
                  }}
                  disabled={isLoading}
                  className={errors.verificationCode ? "border-red-500" : ""}
                  style={{ textAlign: "center", fontSize: "20px", letterSpacing: "8px" }}
                />
                {errors.verificationCode && (
                  <p className="text-sm text-red-500">
                    {errors.verificationCode}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep(1);
                    setVerificationCode("");
                  }}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isLoading ? "Memverifikasi..." : "Verifikasi"}
                </Button>
              </div>

              <div className="text-sm text-center text-muted-foreground">
                Belum menerima kode?{" "}
                {resendCooldown > 0 ? (
                  <span className="text-muted-foreground">
                    Kirim ulang dalam {resendCooldown} detik
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    className="text-primary hover:underline font-medium"
                    disabled={isLoading || resendCooldown > 0}
                  >
                    Kirim ulang
                  </button>
                )}
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
