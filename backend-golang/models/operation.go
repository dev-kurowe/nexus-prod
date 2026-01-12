package models

import (
	"time"
)

type Task struct {
	ID           uint       `json:"id" gorm:"primaryKey"`
	EventID      uint       `json:"event_id"`
	Event        Event      `json:"event" gorm:"foreignKey:EventID"`
	AssignedToID *uint      `json:"assigned_to_id"` // Nullable
	AssignedTo   *User      `json:"assigned_to" gorm:"foreignKey:AssignedToID"`
	CreatedByID  uint       `json:"created_by_id"` // User yang membuat tugas (yang memberi tugas)
	CreatedBy    User       `json:"created_by" gorm:"foreignKey:CreatedByID"`
	Title        string     `json:"title"`
	Description  string     `json:"description"`
	Status       string     `json:"status" gorm:"default:'todo'"` // todo, in-progress, review, done
	Priority     string     `json:"priority"`                     // low, medium, high
	DueDate      *time.Time `json:"due_date"`                     // Nullable
	ProofFile    string     `json:"proof_file"`                   // File bukti pengerjaan
	Comments     string     `json:"comments" gorm:"type:text"`    // Komentar untuk tugas
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}
