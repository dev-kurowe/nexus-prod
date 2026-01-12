import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Preset avatar styles using DiceBear API
const AVATAR_STYLES = [
  { id: "initials", name: "Inisial", url: "" }, // Empty = use initials
  { id: "avataaars", name: "Avataaars", baseUrl: "https://api.dicebear.com/7.x/avataaars/svg" },
  { id: "bottts", name: "Robot", baseUrl: "https://api.dicebear.com/7.x/bottts/svg" },
  { id: "fun-emoji", name: "Emoji", baseUrl: "https://api.dicebear.com/7.x/fun-emoji/svg" },
  { id: "lorelei", name: "Lorelei", baseUrl: "https://api.dicebear.com/7.x/lorelei/svg" },
  { id: "notionists", name: "Notionists", baseUrl: "https://api.dicebear.com/7.x/notionists/svg" },
  { id: "open-peeps", name: "Open Peeps", baseUrl: "https://api.dicebear.com/7.x/open-peeps/svg" },
  { id: "personas", name: "Personas", baseUrl: "https://api.dicebear.com/7.x/personas/svg" },
  { id: "pixel-art", name: "Pixel Art", baseUrl: "https://api.dicebear.com/7.x/pixel-art/svg" },
];

export default function SettingsPage() {
  const { user, login } = useAuth();

  // Profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar
  const [avatar, setAvatar] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAvatar(user.avatar || "");
    }
  }, [user]);

  const getInitials = (nameStr: string) => {
    return nameStr
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate avatar URL based on style and user email
  const generateAvatarUrl = (styleId: string) => {
    const style = AVATAR_STYLES.find(s => s.id === styleId);
    if (!style || styleId === "initials") return "";
    return `${style.baseUrl}?seed=${encodeURIComponent(email || "user")}`;
  };

  const handleSelectAvatar = async (styleId: string) => {
    const newAvatarUrl = generateAvatarUrl(styleId);
    
    try {
      setSavingAvatar(true);
      await api.put("/user/avatar", { avatar: newAvatarUrl });
      setAvatar(newAvatarUrl);

      // Update user context
      const token = Cookies.get("token");
      if (token && user) {
        login({ ...user, avatar: newAvatarUrl }, token);
      }

      toast.success("Avatar berhasil diperbarui");
    } catch {
      toast.error("Gagal memperbarui avatar");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await api.put("/user/profile", { name });

      const token = Cookies.get("token");
      if (token && user) {
        login({ ...user, name }, token);
      }

      toast.success("Profil berhasil diperbarui");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gagal memperbarui profil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak sama");
      return;
    }

    try {
      setSavingPassword(true);
      await api.put("/user/password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success("Password berhasil diganti");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Gagal mengganti password"
      );
    } finally {
      setSavingPassword(false);
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
                <BreadcrumbPage>Pengaturan Akun</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 max-w-4xl mx-auto w-full">
          <h1 className="text-2xl font-bold">Pengaturan Akun</h1>

          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="profile">
                <TabsList className="w-full max-w-md">
                  <TabsTrigger value="profile" className="flex-1">
                    Profil Saya
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex-1">
                    Keamanan
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4 pt-4">
                  {/* Avatar Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Pilih Avatar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Current Avatar Preview */}
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-20 w-20">
                              <AvatarImage src={avatar || undefined} alt={name} />
                              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                {getInitials(name || "U")}
                              </AvatarFallback>
                            </Avatar>
                            {savingAvatar && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{name || "User"}</p>
                            <p className="text-sm text-muted-foreground">Avatar saat ini</p>
                          </div>
                        </div>

                        {/* Avatar Options */}
                        <div>
                          <Label className="mb-3 block">Pilih gaya avatar:</Label>
                          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
                            {AVATAR_STYLES.map((style) => {
                              const styleUrl = style.id === "initials" 
                                ? "" 
                                : `${style.baseUrl}?seed=${encodeURIComponent(email || "user")}`;
                              const isSelected = avatar === styleUrl;
                              
                              return (
                                <button
                                  key={style.id}
                                  onClick={() => handleSelectAvatar(style.id)}
                                  disabled={savingAvatar}
                                  className={cn(
                                    "relative flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all hover:bg-accent",
                                    isSelected 
                                      ? "border-primary bg-primary/10" 
                                      : "border-transparent hover:border-muted-foreground/20"
                                  )}
                                >
                                  <Avatar className="h-12 w-12">
                                    {style.id === "initials" ? (
                                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                        {getInitials(name || "U")}
                                      </AvatarFallback>
                                    ) : (
                                      <AvatarImage src={styleUrl} alt={style.name} />
                                    )}
                                  </Avatar>
                                  <span className="text-[10px] text-center text-muted-foreground truncate w-full">
                                    {style.name}
                                  </span>
                                  {isSelected && (
                                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Profile Info Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Profil</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Nama lengkap"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={email} disabled />
                      </div>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={savingProfile || !name}
                      >
                        {savingProfile ? "Menyimpan..." : "Simpan Profil"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Ganti Password</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="old-password">Password Lama</Label>
                        <Input
                          id="old-password"
                          type="password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="Masukkan password lama"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Password Baru</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Password baru (min 6 karakter)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          Konfirmasi Password Baru
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password baru"
                        />
                      </div>
                      <Button
                        variant="default"
                        onClick={handleChangePassword}
                        disabled={
                          savingPassword ||
                          !oldPassword ||
                          !newPassword ||
                          !confirmPassword
                        }
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {savingPassword ? "Mengganti..." : "Ganti Password"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
