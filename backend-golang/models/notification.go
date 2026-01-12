package models

import (
	"time"

	"gorm.io/gorm"
)

// NotificationType mendefinisikan jenis notifikasi
type NotificationType string

const (
	// Notifikasi untuk Peserta
	NotifRegistrationSubmitted NotificationType = "registration_submitted" // Pendaftaran berhasil diajukan
	NotifRegistrationApproved  NotificationType = "registration_approved"  // Pendaftaran disetujui
	NotifRegistrationRejected  NotificationType = "registration_rejected"  // Pendaftaran ditolak
	NotifEventReminder         NotificationType = "event_reminder"         // Reminder H-1 event
	NotifCertificateReady      NotificationType = "certificate_ready"      // Sertifikat siap download
	NotifPaymentSuccess        NotificationType = "payment_success"        // Pembayaran berhasil
	NotifPaymentPending        NotificationType = "payment_pending"        // Menunggu pembayaran

	// Notifikasi untuk Panitia
	NotifNewRegistration NotificationType = "new_registration" // Ada pendaftar baru
	NotifTaskAssigned    NotificationType = "task_assigned"    // Ditugaskan task baru
	NotifTaskDeadline    NotificationType = "task_deadline"    // Deadline tugas mendekat
	NotifTaskCompleted   NotificationType = "task_completed"   // Task selesai dikerjakan
	NotifLoanRequest     NotificationType = "loan_request"     // Request peminjaman baru
	NotifLoanApproved    NotificationType = "loan_approved"    // Peminjaman disetujui
	NotifLoanRejected    NotificationType = "loan_rejected"    // Peminjaman ditolak
	NotifBudgetApproval  NotificationType = "budget_approval"  // Request approval anggaran
	NotifCommitteeAdded  NotificationType = "committee_added"  // Ditambahkan sebagai panitia
	NotifEventPublished  NotificationType = "event_published"  // Event dipublish
)

// Notification menyimpan notifikasi untuk user
type Notification struct {
	ID      uint             `json:"id" gorm:"primaryKey"`
	UserID  uint             `json:"user_id" gorm:"index;not null"`
	User    User             `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Type    NotificationType `json:"type" gorm:"type:varchar(50);not null"`
	Title   string           `json:"title" gorm:"type:varchar(255);not null"`
	Message string           `json:"message" gorm:"type:text"`
	IsRead  bool             `json:"is_read" gorm:"default:false"`
	ReadAt  *time.Time       `json:"read_at,omitempty"`

	// Reference ke entity terkait (optional)
	EntityType string `json:"entity_type,omitempty" gorm:"type:varchar(50)"` // event, registration, task, loan, etc
	EntityID   uint   `json:"entity_id,omitempty"`

	// Link untuk redirect (optional)
	ActionURL string `json:"action_url,omitempty" gorm:"type:varchar(255)"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}

// NotificationSummary untuk response ringkasan
type NotificationSummary struct {
	UnreadCount int `json:"unread_count"`
	TotalCount  int `json:"total_count"`
}
