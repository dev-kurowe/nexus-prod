package models

import (
	"time"
	// "gorm.io/gorm" <-- Hapus baris ini
)

type Event struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Title       string    `json:"title" gorm:"size:255;not null"`
	Slug        string    `json:"slug" gorm:"uniqueIndex;type:varchar(255);not null"`
	Description string    `json:"description" gorm:"type:text"`
	Banner      string    `json:"banner"`
	Location    string    `json:"location"`
	StartDate   time.Time `json:"start_date"`
	EndDate     time.Time `json:"end_date"`

	RegistrationDeadline *time.Time `json:"registration_deadline"` // Tenggat waktu pendaftaran (nullable)

	Status    string `json:"status" gorm:"default:'draft'"`
	EventType string `json:"event_type" gorm:"default:'offline'"` // "offline", "online" (webinar/zoom), atau "hybrid" (keduanya)
	Quota     int    `json:"quota"`
	Category  string `json:"category" gorm:"size:100"`
	Price     int64  `json:"price" gorm:"default:0"`    // Harga event dalam rupiah
	Speakers  string `json:"speakers" gorm:"type:text"` // JSON array of speakers (name, title, photo)

	CreatedByID uint `json:"created_by_id"`
	CreatedBy   User `json:"created_by" gorm:"foreignKey:CreatedByID"`

	Committees []CommitteeMember `json:"committees" gorm:"foreignKey:EventID"`
	FormSchema []FormField       `json:"form_schema" gorm:"foreignKey:EventID"`
	Tasks      []Task            `json:"tasks" gorm:"foreignKey:EventID"`
	Budgets    []Budget          `json:"budgets" gorm:"foreignKey:EventID"`
	Loans      []Loan            `json:"loans" gorm:"foreignKey:EventID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CommitteeMember struct {
	ID      uint `json:"id" gorm:"primaryKey"`
	EventID uint `json:"event_id" gorm:"not null"`
	UserID  uint `json:"user_id" gorm:"not null"`

	Division string `json:"division"`
	Position string `json:"position"`

	Event Event `json:"event" gorm:"foreignKey:EventID"`
	User  User  `json:"user" gorm:"foreignKey:UserID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
