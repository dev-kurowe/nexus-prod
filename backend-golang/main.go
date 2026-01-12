package main

import (
	"fmt"
	"log"
	"os"
	"santrikoding/backend-api/config"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/routes"
)

func main() {

	//load config .envs
	config.LoadEnv()

	//inisialisasi database
	database.InitDB()

	//setup router
	r := routes.SetupRouter()

	//mulai server
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("\n========================================\n")
	fmt.Printf("🚀 Server berjalan di port: %s\n", port)
	fmt.Printf("📍 API Base URL: http://localhost:%s/api\n", port)
	fmt.Printf("========================================\n\n")

	// Bind to 0.0.0.0 to accept connections from all interfaces (required for Kubernetes)
	if err := r.Run("0.0.0.0:" + port); err != nil {
		log.Fatal("Gagal menjalankan server:", err)
	}
}
