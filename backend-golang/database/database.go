package database

import (
	"fmt"
	"log"
	"santrikoding/backend-api/config"
	"santrikoding/backend-api/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {

	// Load konfigurasi database dari .env
	dbUser := config.GetEnv("DB_USER", "root")
	dbPass := config.GetEnv("DB_PASS", "")
	dbHost := config.GetEnv("DB_HOST", "localhost")
	dbPort := config.GetEnv("DB_PORT", "3306")
	dbName := config.GetEnv("DB_NAME", "")

	// Format DSN untuk MySQL
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPass, dbHost, dbPort, dbName)

	// Koneksi ke database
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	fmt.Println("Database connected successfully!")

	// **Auto Migrate Models**
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

	// Manual migration: Drop foreign key constraint dan kolom inventory_id jika masih ada
	// Cek dulu apakah constraint ada
	var constraintExists bool
	DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loan_items' AND CONSTRAINT_NAME = 'fk_loan_items_inventory'").Scan(&constraintExists)
	if constraintExists {
		// Drop foreign key constraint dulu
		DB.Exec("ALTER TABLE loan_items DROP FOREIGN KEY fk_loan_items_inventory")
		fmt.Println("Dropped foreign key constraint fk_loan_items_inventory")
	}

	// Cek apakah kolom inventory_id masih ada
	var columnExists bool
	DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loan_items' AND COLUMN_NAME = 'inventory_id'").Scan(&columnExists)
	if columnExists {
		// Drop kolom setelah constraint dihapus
		DB.Exec("ALTER TABLE loan_items DROP COLUMN inventory_id")
		fmt.Println("Dropped old inventory_id column from loan_items table")
	}

	fmt.Println("Database migrated successfully!")
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
