package models

import "time"

type Broadcast struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Title       string     `json:"title" gorm:"size:200;not null"`
	Message     string     `json:"message" gorm:"type:text;not null"`
	Type        string     `json:"type" gorm:"size:50;default:'info'"` // info, warning, success, danger
	TargetRole  string     `json:"target_role" gorm:"size:50"`         // all, superadmin, mahasiswa, dll (kosong = semua)
	SendEmail   bool       `json:"send_email" gorm:"default:false"`
	SendPush    bool       `json:"send_push" gorm:"default:true"`
	SentAt      *time.Time `json:"sent_at"`
	SentBy      uint       `json:"sent_by"`
	User        User       `json:"user" gorm:"foreignKey:SentBy"`
	ReadCount   int        `json:"read_count" gorm:"default:0"`
	TotalTarget int        `json:"total_target" gorm:"default:0"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// BroadcastRead untuk tracking siapa yang sudah baca
type BroadcastRead struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	BroadcastID uint      `json:"broadcast_id" gorm:"not null"`
	Broadcast   Broadcast `json:"broadcast" gorm:"foreignKey:BroadcastID;constraint:OnDelete:CASCADE"`
	UserID      uint      `json:"user_id" gorm:"not null"`
	User        User      `json:"user" gorm:"foreignKey:UserID"`
	ReadAt      time.Time `json:"read_at"`
}
