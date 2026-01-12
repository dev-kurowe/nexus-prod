package main

import (
	"fmt"
	"log"

	// "os" // <-- Hapus ini kalau tidak dipakai (karena kita hardcode port)
	// "santrikoding/backend-api/config" <-- HAPUS INI (Penyebab Crash)
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/routes"
)

func main() {

	// ❌ HAPUS BARIS INI: config.LoadEnv()
	// Di Cloud, Environment Variable otomatis terbaca dari sistem,
	// tidak perlu load file .env lagi. Kalau dipaksa, malah error.

	// 1. Inisialisasi database
	database.InitDB()

	// 2. Setup router
	r := routes.SetupRouter()

	// 3. Mulai server (LANGSUNG TEMBAK PORT 8080)
	// Kita hardcode biar DigitalOcean senang dan tidak salah sambung lagi.
	port := "8080"

	fmt.Printf("\n========================================\n")
	fmt.Printf("🚀 Server berjalan di port: %s\n", port)
	fmt.Printf("========================================\n\n")

	// Pastikan titik dua (:) ada di depan port
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Gagal menjalankan server:", err)
	}
}
