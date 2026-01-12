import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Mail,
  Bell,
  Shield,
  Globe,
  Save,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: string;
  category: string;
  description: string;
  is_public: boolean;
}

interface SettingsResponse {
  settings: SystemSetting[];
  grouped: Record<string, SystemSetting[]>;
}

const categoryIcons: Record<string, React.ReactNode> = {
  general: <Globe className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  notification: <Bell className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  general: "Umum",
  email: "Email & SMTP",
  notification: "Notifikasi",
  security: "Keamanan",
};

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("general");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      return response.data.data as SettingsResponse;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: { key: string; value: string }[]) => {
      return api.put("/admin/settings/bulk", { settings });
    },
    onSuccess: () => {
      toast.success("Pengaturan berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      setEditedSettings({});
    },
    onError: () => {
      toast.error("Gagal menyimpan pengaturan");
    },
  });

  const handleValueChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const settings = Object.entries(editedSettings).map(([key, value]) => ({
      key,
      value,
    }));
    if (settings.length > 0) {
      updateMutation.mutate(settings);
    }
  };

  const getValue = (setting: SystemSetting) => {
    return editedSettings[setting.key] ?? setting.value;
  };

  const hasChanges = Object.keys(editedSettings).length > 0;

  const renderSettingInput = (setting: SystemSetting) => {
    const value = getValue(setting);

    if (setting.type === "boolean") {
      return (
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor={setting.key}>{formatLabel(setting.key)}</Label>
            <p className="text-sm text-muted-foreground">{setting.description}</p>
          </div>
          <Switch
            id={setting.key}
            checked={value === "true" || value === "1"}
            onCheckedChange={(checked) => handleValueChange(setting.key, checked ? "true" : "false")}
          />
        </div>
      );
    }

    if (setting.key.includes("password")) {
      return (
        <div className="space-y-2">
          <Label htmlFor={setting.key}>{formatLabel(setting.key)}</Label>
          <Input
            id={setting.key}
            type="password"
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            placeholder={setting.description}
          />
          <p className="text-xs text-muted-foreground">{setting.description}</p>
        </div>
      );
    }

    if (setting.type === "number") {
      return (
        <div className="space-y-2">
          <Label htmlFor={setting.key}>{formatLabel(setting.key)}</Label>
          <Input
            id={setting.key}
            type="number"
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            placeholder={setting.description}
          />
          <p className="text-xs text-muted-foreground">{setting.description}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={setting.key}>{formatLabel(setting.key)}</Label>
        <Input
          id={setting.key}
          value={value}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          placeholder={setting.description}
        />
        <p className="text-xs text-muted-foreground">{setting.description}</p>
      </div>
    );
  };

  const formatLabel = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Pengaturan Sistem</h1>
              <p className="text-muted-foreground">
                Konfigurasi aplikasi dan integrasi
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>

          {hasChanges && (
            <Card className="border-orange-500 bg-orange-500/10">
              <CardContent className="flex items-center gap-2 py-3">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">
                  Anda memiliki {Object.keys(editedSettings).length} perubahan yang belum disimpan
                </span>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                {Object.keys(categoryLabels).map((category) => (
                  <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                    {categoryIcons[category]}
                    {categoryLabels[category]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.keys(categoryLabels).map((category) => {
                const settings = data?.grouped?.[category] || [];
                return (
                  <TabsContent key={category} value={category}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {categoryIcons[category]}
                          {categoryLabels[category]}
                        </CardTitle>
                        <CardDescription>
                          Konfigurasi pengaturan {categoryLabels[category].toLowerCase()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {settings.length > 0 ? (
                          settings.map((setting, idx) => (
                            <div key={setting.id}>
                              {renderSettingInput(setting)}
                              {idx < settings.length - 1 && <Separator className="mt-4" />}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                            <p>Belum ada pengaturan untuk kategori ini.</p>
                            <p className="text-sm">Klik Refresh untuk memuat ulang data.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Informasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Total Pengaturan</p>
                  <p className="text-2xl font-bold">{data?.settings?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Kategori</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.keys(data?.grouped || {}).map((cat) => (
                      <Badge key={cat} variant="secondary">
                        {categoryLabels[cat] || cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
