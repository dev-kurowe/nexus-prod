import React from "react";
import QRCode from "react-qr-code";
import { Calendar, MapPin, User, Mail } from "lucide-react";

interface TicketProps {
  data: any;
}

export const TicketPrint = React.forwardRef<HTMLDivElement, TicketProps>(
  ({ data }, ref) => {
    if (!data) {
      return <div ref={ref} className="p-4">Memuat data tiket...</div>;
    }

    return (
      <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[800px] mx-auto border-2 border-dashed border-gray-300 m-4">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wider">{data.event.title}</h1>
            <p className="text-gray-600 mt-1">E-TICKET / BUKTI PENDAFTARAN</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-blue-600">CONFIRMED</h2>
            <p className="text-sm font-mono">{data.qr_code}</p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex gap-8">
          {/* INFO EVENT */}
          <div className="flex-1 space-y-6">
            
            {/* Waktu */}
            <div className="flex items-start gap-3">
              <Calendar className="w-6 h-6 mt-1" />
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Waktu Pelaksanaan</p>
                <p className="text-lg">
                  {new Date(data.event.start_date).toLocaleDateString("id-ID", { 
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
                  })}
                </p>
                <p className="text-lg">
                    {new Date(data.event.start_date).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                </p>
              </div>
            </div>

            {/* Lokasi */}
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 mt-1" />
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Lokasi</p>
                <p className="text-lg leading-tight">{data.event.location}</p>
              </div>
            </div>

            {/* Peserta */}
            <div className="flex items-start gap-3 pt-4 border-t">
              <User className="w-6 h-6 mt-1" />
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Nama Peserta</p>
                <p className="text-xl font-bold">{data.user?.name || "Peserta"}</p>
              </div>
            </div>
             <div className="flex items-start gap-3">
              <Mail className="w-6 h-6 mt-1" />
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Email</p>
                <p className="text-md">{data.user?.email || "-"}</p>
              </div>
            </div>

          </div>

          {/* QR CODE - Hanya ditampilkan untuk event offline */}
          {data.event.event_type === "offline" && (
            <div className="w-[250px] flex flex-col items-center justify-center border-l-2 pl-8 border-gray-200">
              <div className="bg-white p-2 border-4 border-black">
                  <QRCode value={data.qr_code} size={180} />
              </div>
              <p className="text-center text-xs mt-4 text-gray-500">
                Tunjukkan QR Code ini kepada panitia saat registrasi ulang.
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="mt-8 pt-4 border-t-2 border-black text-center text-xs text-gray-400">
          Dicetak pada: {new Date().toLocaleString()} | Sistem Event Organizer
        </div>
      </div>
    );
  }
);

TicketPrint.displayName = "TicketPrint";