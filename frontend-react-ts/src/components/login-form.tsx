import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import Cookies from "js-cookie";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await api.post("/login", {
        username: credential,
        password: password,
      });
      const responseData = response.data;
      const token = responseData.data?.token;
      const userData = responseData.data;

      if (token && userData) {
        // Normalize user data untuk memastikan field yang dibutuhkan tersedia
        // Backend mengirim: { id, name, username, email, role (Role.Code), role_id (RoleID), avatar, token }
        const normalizedUserData = {
          id: userData.id || userData.Id || userData.user_id,
          name: userData.name || userData.Name,
          email: userData.email || userData.Email,
          username: userData.username || userData.Username,
          role: userData.role || userData.Role || "", // Role.Code dari backend (e.g., "superadmin")
          role_id: userData.role_id || userData.RoleID || userData.roleId || null, // Role ID (e.g., 1)
          avatar: userData.avatar || userData.Avatar || "", // Avatar URL
        };
        
        console.log("Login success - Original user data:", userData);
        console.log("Login success - Normalized user data:", normalizedUserData);
        Cookies.set("token", token); 
        // Tunggu login selesai (termasuk fetch committee status jika mahasiswa)
        await login(normalizedUserData, token);
        navigate("/dashboard");
      } else {
        console.warn("Struktur respons aneh:", responseData);
        setError("Login berhasil tapi data tidak terbaca.");
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError("Tidak dapat terhubung ke server. Pastikan backend server sudah berjalan di http://localhost:8000");
      } else if (err.response && err.response.data) {
        const msg = err.response.data.message || "Login gagal.";
        if (err.response.data.errors) {
          setError(
            "Validasi Gagal: " + JSON.stringify(err.response.data.errors)
          );
        } else {
          setError(msg);
        }
      } else {
        setError("Tidak dapat terhubung ke server. Pastikan backend server sudah berjalan.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <form
      onSubmit={handleLogin}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
        <FieldGroup>
            <div className="flex flex-col items-center gap-1 text-center">
                <h1 className="text-2xl font-bold">Login to your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                    Enter your email below to login to your account
                </p>
            </div>
            {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm text-center">
                {error}
            </div>
            )}
            
            <Field>
                <FieldLabel htmlFor="email">Email / Username</FieldLabel>
                <Input
                    id="email"
                    type="text"
                    placeholder="m@example.com or username"
                    required
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    disabled={isLoading}
                />
            </Field>

            <Field>
                <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Link
                    to="/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                    Forgot your password?
                    </Link>
                </div>
                <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                />
            </Field>

            <Field>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                </Button>
            </Field>

            <div className="text-sm text-center text-muted-foreground">
                Belum punya akun?{" "}
                <Link
                    to="/register"
                    className="text-primary hover:underline font-medium"
                >
                    Daftar di sini
                </Link>
            </div>
        </FieldGroup>
    </form>
  );
}