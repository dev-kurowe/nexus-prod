import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import api from "../../services/api";
import { Link } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
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
import { AlertCircle, CheckCircle, RefreshCcw, ScanLine } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ScanQrPage() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isScanning, setIsScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

  const handleScan = async (decodedText: string) => {
    if (decodedText && !processing) {
      setProcessing(true);
      setIsScanning(false);

      try {
        const response = await api.post("/scan/check-in", {
            qr_code: decodedText
        });
        setScanResult({
            success: true,
            message: response.data.message,
            data: response.data.data
        });
        setErrorMsg("");

      } catch (err: any) {
        setScanResult(null);
        let msg = err.response?.data?.message || "Terjadi kesalahan sistem";
        
        // Jika error karena event online, tampilkan pesan yang lebih informatif
        if (msg.includes("event online") || msg.includes("Event ini adalah event online")) {
          msg = "Event ini adalah event online. Peserta dapat konfirmasi kehadiran sendiri via link di tiket mereka. Scan QR hanya untuk event offline.";
        }
        
        setErrorMsg(msg);
      } finally {
        setProcessing(false);
      }
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setErrorMsg("");
    setIsScanning(true);
    setProcessing(false);
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
                <BreadcrumbPage>Scan Absensi</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto w-full">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Scanner Kehadiran (Event Offline)</h1>
            <p className="text-muted-foreground text-sm">Arahkan kamera ke QR Code peserta</p>
            <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              💡 Untuk event online, peserta dapat konfirmasi kehadiran sendiri via link di tiket mereka.
            </p>
          </div>

          {/* AREA KAMERA */}
          <div className="w-full aspect-square bg-black rounded-xl overflow-hidden relative shadow-lg border-4 border-slate-900">
            {isScanning ? (
                <Scanner 
                    onScan={(result) => {
                        if (result && result.length > 0) {
                            handleScan(result[0].rawValue);
                        }
                    }}
                    styles={{
                        container: { width: "100%", height: "100%" }
                    }}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-full bg-slate-100 text-slate-500">
                    <ScanLine className="w-12 h-12 mb-2 animate-pulse" />
                    <p>Processing...</p>
                </div>
            )}
          </div>

          {scanResult && (
            <Card className="w-full border-green-500 bg-green-50 animate-in fade-in slide-in-from-bottom-5">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-6 h-6" />
                        <CardTitle>Check-in Berhasil!</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-sm space-y-1 text-green-800">
                        <p className="font-bold text-lg">{scanResult.data.user_name}</p>
                        <p>{scanResult.data.event}</p>
                        <p className="opacity-70 text-xs mt-2">Status updated to: Checked In</p>
                    </div>
                    <Button onClick={resetScan} className="w-full mt-4 bg-green-600 hover:bg-green-700">
                        Scan Peserta Berikutnya
                    </Button>
                </CardContent>
            </Card>
          )}

          {errorMsg && (
             <Alert variant="destructive" className="animate-in fade-in slide-in-from-bottom-5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Gagal Check-in</AlertTitle>
                <AlertDescription className="mt-2">
                    {errorMsg}
                </AlertDescription>
                <Button variant="outline" onClick={resetScan} className="w-full mt-3 border-red-200 hover:bg-red-100 text-red-600">
                    <RefreshCcw className="w-4 h-4 mr-2" /> Coba Lagi
                </Button>
             </Alert>
          )}

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}