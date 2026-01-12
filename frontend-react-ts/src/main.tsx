import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { BrowserRouter } from "react-router-dom"; 
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

// Set Midtrans Client Key ke script tag jika ada
const midtransClientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
if (midtransClientKey) {
  const snapScript = document.getElementById('midtrans-snap-script') as HTMLScriptElement;
  if (snapScript) {
    snapScript.setAttribute('data-client-key', midtransClientKey);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);