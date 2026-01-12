package models

import "time"

// Loan represents a loan request for an event
type Loan struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	EventID    uint       `json:"event_id" gorm:"not null"`
	Event      Event      `json:"event" gorm:"foreignKey:EventID"`
	LoanDate   time.Time  `json:"loan_date" gorm:"not null"`
	ReturnDate time.Time  `json:"return_date" gorm:"not null"`
	Status     string     `json:"status" gorm:"size:50;default:'pending'"` // pending, approved, returned, rejected
	Notes      string     `json:"notes" gorm:"type:text"`
	Items      []LoanItem `json:"items" gorm:"foreignKey:LoanID"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// LoanItem represents items in a loan request (barang yang dipinjam dari luar)
type LoanItem struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	LoanID      uint      `json:"loan_id" gorm:"not null"`
	Loan        Loan      `json:"loan" gorm:"foreignKey:LoanID"`
	ItemName    string    `json:"item_name" gorm:"size:255;not null"`    // Nama barang
	Quantity    int       `json:"quantity" gorm:"not null"`               // Jumlah
	Supplier    string    `json:"supplier" gorm:"size:255"`               // Pemberi pinjaman/vendor
	Description string    `json:"description" gorm:"type:text"`          // Deskripsi/keterangan
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
