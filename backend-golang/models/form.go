package models

import (
	"encoding/json"
	"time"
)

type FormField struct {
	ID               uint            `json:"id" gorm:"primaryKey"`
	EventID          uint            `json:"event_id" gorm:"index"`
	Label            string          `json:"label"`
	FieldType        string          `json:"field_type"`
	Options          json.RawMessage `json:"options" gorm:"type:text"`
	IsRequired       bool            `json:"is_required"`
	Order            int             `json:"order"`
	ParentFieldID    *uint           `json:"parent_field_id" gorm:"index"`       // ID field parent jika ini adalah conditional field
	ConditionalValue string          `json:"conditional_value" gorm:"size:255"`  // Nilai yang harus dipenuhi dari parent field untuk menampilkan field ini (misalnya "Ya")
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}
