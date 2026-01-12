package models

import "time"

type Certificate struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	RegistrationID uint   `json:"registration_id" gorm:"uniqueIndex;not null"`
	CertificateURL string `json:"certificate_url" gorm:"type:text"` // URL file gambar sertifikat yang di-upload
	CertificateCode string `json:"certificate_code" gorm:"size:100;unique"` // Kode unik untuk validasi
	UploadedAt     time.Time `json:"uploaded_at"` // Waktu upload oleh panitia
	EmailSent      bool   `json:"email_sent" gorm:"default:false"` // Status apakah sudah dikirim via email
	EmailSentAt    *time.Time `json:"email_sent_at"` // Waktu email dikirim

	// Relasi
	Registration Registration `json:"registration" gorm:"foreignKey:RegistrationID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
