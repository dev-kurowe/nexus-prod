package models

import "time"

// Budget represents budgeting data per event/division.
type Budget struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	EventID    uint      `json:"event_id"`
	Division   string    `json:"division"`  // Divisi (Acara, Konsumsi, dll)
	ItemName   string    `json:"item_name"` // Nama Barang
	Quantity   int       `json:"quantity"`
	PlanAmount float64   `json:"plan_amount"`                     // Rencana Biaya (Total)
	RealAmount float64   `json:"real_amount"`                     // Realisasi Biaya (Total)
	Status     string    `json:"status" gorm:"default:'pending'"` // pending, paid, rejected
	ProofImage string    `json:"proof_image"`                     // URL Foto Struk
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
