package models

import "time"

type SystemSetting struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Key         string    `json:"key" gorm:"size:100;uniqueIndex;not null"`
	Value       string    `json:"value" gorm:"type:text"`
	Type        string    `json:"type" gorm:"size:50;default:'string'"` // string, number, boolean, json
	Category    string    `json:"category" gorm:"size:50"`              // general, email, notification, security
	Description string    `json:"description" gorm:"size:255"`
	IsPublic    bool      `json:"is_public" gorm:"default:false"` // Apakah bisa diakses tanpa login
	UpdatedBy   *uint     `json:"updated_by"`                     // Nullable untuk default settings
	User        *User     `json:"user" gorm:"foreignKey:UpdatedBy"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Default settings untuk inisialisasi
var DefaultSettings = []SystemSetting{
	// General
	{Key: "app_name", Value: "Event Management System", Type: "string", Category: "general", Description: "Nama aplikasi", IsPublic: true},
	{Key: "app_logo", Value: "", Type: "string", Category: "general", Description: "URL logo aplikasi", IsPublic: true},
	{Key: "maintenance_mode", Value: "false", Type: "boolean", Category: "general", Description: "Mode maintenance"},
	{Key: "maintenance_message", Value: "Sistem sedang dalam perbaikan. Silakan coba lagi nanti.", Type: "string", Category: "general", Description: "Pesan maintenance"},

	// Email
	{Key: "smtp_host", Value: "", Type: "string", Category: "email", Description: "SMTP Host"},
	{Key: "smtp_port", Value: "587", Type: "number", Category: "email", Description: "SMTP Port"},
	{Key: "smtp_email", Value: "", Type: "string", Category: "email", Description: "Email pengirim"},
	{Key: "smtp_password", Value: "", Type: "string", Category: "email", Description: "Password SMTP"},
	{Key: "email_from_name", Value: "Event Management System", Type: "string", Category: "email", Description: "Nama pengirim email"},

	// Notification
	{Key: "enable_email_notification", Value: "true", Type: "boolean", Category: "notification", Description: "Aktifkan notifikasi email"},
	{Key: "enable_push_notification", Value: "false", Type: "boolean", Category: "notification", Description: "Aktifkan push notification"},

	// Security
	{Key: "jwt_expiry_hours", Value: "24", Type: "number", Category: "security", Description: "Durasi token JWT (jam)"},
	{Key: "max_login_attempts", Value: "5", Type: "number", Category: "security", Description: "Maksimal percobaan login"},
	{Key: "lockout_duration_minutes", Value: "30", Type: "number", Category: "security", Description: "Durasi lockout (menit)"},
}
