package models

import "time"

// Sesuai tabel `registrations` di db_golang.sql
type Registration struct {
	ID      uint `json:"id" gorm:"primaryKey"`
	EventID uint `json:"event_id"`
	UserID  uint `json:"user_id"`

	Status             string `json:"status" gorm:"default:pending"` // pending, confirmed, rejected
	Attendance         bool   `json:"attendance" gorm:"default:false"`
	AttendanceType     string `json:"attendance_type"`                // "offline" (scan QR) atau "online" (self check-in) - untuk event hybrid
	AttendanceProofURL string `json:"attendance_proof_url"`           // URL bukti kehadiran (screenshot zoom, dll)
	QRCode             string `json:"qr_code" gorm:"size:191;unique"` // Menyimpan kode unik tiket
	CertificateURL     string `json:"certificate_url"`

	// Payment fields
	PaymentToken string    `json:"payment_token"` // Untuk Snap Token
	PaymentURL   string    `json:"payment_url"`   // URL Redirect (Opsional)
	OrderID      string    `json:"order_id"`      // Order ID dari Midtrans
	PaidAt       time.Time `*json:"paid_at"`      // Waktu pembayaran sukses

	// Relasi
	Event   Event        `json:"event" gorm:"foreignKey:EventID"`
	User    User         `json:"user" gorm:"foreignKey:UserID"`
	Answers []FormAnswer `json:"answers" gorm:"foreignKey:RegistrationID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Sesuai tabel `form_answers` di db_golang.sql
type FormAnswer struct {
	ID             uint `json:"id" gorm:"primaryKey"`
	RegistrationID uint `json:"registration_id"`
	FormFieldID    uint `json:"form_field_id"`

	Value string `json:"value" gorm:"type:text"`

	// Relasi untuk detail pertanyaan
	FormField FormField `json:"form_field" gorm:"foreignKey:FormFieldID"`
}
