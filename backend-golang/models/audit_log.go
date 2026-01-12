package models

import "time"

type AuditLog struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	UserID      uint      `json:"user_id"`
	User        User      `json:"user" gorm:"foreignKey:UserID"`
	Action      string    `json:"action" gorm:"size:100;not null"` // create, update, delete, login, logout
	EntityType  string    `json:"entity_type" gorm:"size:50"`      // user, event, task, budget, loan, etc
	EntityID    uint      `json:"entity_id"`                       // ID dari entity yang diubah
	OldValue    string    `json:"old_value" gorm:"type:text"`      // JSON old data
	NewValue    string    `json:"new_value" gorm:"type:text"`      // JSON new data
	IPAddress   string    `json:"ip_address" gorm:"size:50"`       // IP address user
	UserAgent   string    `json:"user_agent" gorm:"size:255"`      // Browser/device info
	Description string    `json:"description" gorm:"type:text"`    // Deskripsi perubahan
	CreatedAt   time.Time `json:"created_at"`
}
