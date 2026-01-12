package models

import "time"

type Activity struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	UserID      uint      `json:"user_id" gorm:"not null"`
	User        User      `json:"user" gorm:"foreignKey:UserID"`
	ActivityType string   `json:"activity_type" gorm:"size:50;not null"` // task_completed, event_created, task_assigned, comment_added, file_uploaded
	EntityType  string    `json:"entity_type" gorm:"size:50"`             // task, event, budget, loan
	EntityID    uint      `json:"entity_id"`                              // ID dari entity terkait
	Description string    `json:"description" gorm:"type:text;not null"` // Deskripsi aktivitas
	Metadata    string    `json:"metadata" gorm:"type:text"`              // JSON metadata (opsional)
	CreatedAt   time.Time `json:"created_at"`
}
