package models

import "time"

// Inventory represents master data for items/equipment owned by the organization
type Inventory struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	Name           string    `json:"name" gorm:"size:255;not null"`
	Description    string    `json:"description" gorm:"type:text"`
	TotalStock     int       `json:"total_stock" gorm:"not null;default:0"`
	AvailableStock int       `json:"available_stock" gorm:"not null;default:0"`
	Condition      string    `json:"condition" gorm:"size:50;default:'Good'"` // Good, Broken, Maintenance
	ImageURL       string    `json:"image_url"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
