package main

import (
	"fmt"
	"log"
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
	port := config.GetEnv("APP_PORT", "8000")
	fmt.Printf("\n========================================\n")
	fmt.Printf("🚀 Server berjalan di port: %s\n", port)
	fmt.Printf("📍 API Base URL: http://localhost:%s/api\n", port)
	fmt.Printf("========================================\n\n")
	
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Gagal menjalankan server:", err)
	}
}
