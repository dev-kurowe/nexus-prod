package database

import (
	"fmt"
	"log"
	"os" // ✅ Kita pakai library bawaan biar aman di Cloud
	"santrikoding/backend-api/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

// Fungsi helper kecil untuk membaca Env Var dengan nilai default
// Ini pengganti config.GetEnv biar kita gak perlu import package config yang bermasalah
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func InitDB() {

	// ✅ Pakai fungsi helper kita sendiri (bukan dari package config)
	dbUser := getEnv("DB_USER", "root")
	dbPass := getEnv("DB_PASS", "")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "3306")
	dbName := getEnv("DB_NAME", "")

	// Format DSN untuk MySQL
	// Tambahan: parseTime=True penting untuk tanggal
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPass, dbHost, dbPort, dbName)

	fmt.Printf("Connecting to DB: %s@%s:%s\n", dbUser, dbHost, dbPort) // Debug print

	// Koneksi ke database
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	fmt.Println("Database connected successfully!")

	// **Auto Migrate Models**
	// (Bagian ini saya biarkan sama persis karena sudah benar)
	err = DB.AutoMigrate(&models.User{})
	if err != nil {
		log.Printf("Warning: Failed to migrate User: %v", err)
	}

	err = DB.AutoMigrate(&models.Role{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Role: %v", err)
	}

	err = DB.AutoMigrate(&models.Event{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Event: %v", err)
	}

	err = DB.AutoMigrate(&models.CommitteeMember{})
	if err != nil {
		log.Printf("Warning: Failed to migrate CommitteeMember: %v", err)
	}

	err = DB.AutoMigrate(&models.FormField{})
	if err != nil {
		log.Printf("Warning: Failed to migrate FormField: %v", err)
	}

	err = DB.AutoMigrate(&models.FormAnswer{})
	if err != nil {
		log.Printf("Warning: Failed to migrate FormAnswer: %v", err)
	}

	err = DB.AutoMigrate(&models.Registration{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Registration: %v", err)
	}

	err = DB.AutoMigrate(&models.Certificate{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Certificate: %v", err)
	}

	err = DB.AutoMigrate(&models.Budget{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Budget: %v", err)
	}

	err = DB.AutoMigrate(&models.Task{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Task: %v", err)
	}

	err = DB.AutoMigrate(&models.Inventory{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Inventory: %v", err)
	}

	err = DB.AutoMigrate(&models.Loan{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Loan: %v", err)
	}

	err = DB.AutoMigrate(&models.LoanItem{})
	if err != nil {
		log.Printf("Warning: Failed to migrate LoanItem: %v", err)
	}

	err = DB.AutoMigrate(&models.Activity{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Activity: %v", err)
	}

	// Master Data Tables
	err = DB.AutoMigrate(&models.University{})
	if err != nil {
		log.Printf("Warning: Failed to migrate University: %v", err)
	}

	err = DB.AutoMigrate(&models.Faculty{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Faculty: %v", err)
	}

	err = DB.AutoMigrate(&models.StudyProgram{})
	if err != nil {
		log.Printf("Warning: Failed to migrate StudyProgram: %v", err)
	}

	err = DB.AutoMigrate(&models.Student{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Student: %v", err)
	}

	err = DB.AutoMigrate(&models.Organization{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Organization: %v", err)
	}

	err = DB.AutoMigrate(&models.Notification{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Notification: %v", err)
	}

	err = DB.AutoMigrate(&models.AuditLog{})
	if err != nil {
		log.Printf("Warning: Failed to migrate AuditLog: %v", err)
	}

	err = DB.AutoMigrate(&models.SystemSetting{})
	if err != nil {
		log.Printf("Warning: Failed to migrate SystemSetting: %v", err)
	}

	err = DB.AutoMigrate(&models.Broadcast{})
	if err != nil {
		log.Printf("Warning: Failed to migrate Broadcast: %v", err)
	}

	err = DB.AutoMigrate(&models.BroadcastRead{})
	if err != nil {
		log.Printf("Warning: Failed to migrate BroadcastRead: %v", err)
	}

	// Manual migration checks
	var constraintExists bool
	DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loan_items' AND CONSTRAINT_NAME = 'fk_loan_items_inventory'").Scan(&constraintExists)
	if constraintExists {
		DB.Exec("ALTER TABLE loan_items DROP FOREIGN KEY fk_loan_items_inventory")
		fmt.Println("Dropped foreign key constraint fk_loan_items_inventory")
	}

	var columnExists bool
	DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loan_items' AND COLUMN_NAME = 'inventory_id'").Scan(&columnExists)
	if columnExists {
		DB.Exec("ALTER TABLE loan_items DROP COLUMN inventory_id")
		fmt.Println("Dropped old inventory_id column from loan_items table")
	}

	fmt.Println("Database migrated successfully!")
}
