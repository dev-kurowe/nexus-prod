package models

import (
	"time"

	"gorm.io/gorm"
)

type Role struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`        // e.g., "Super Admin", "Mahasiswa"
	Code        string    `json:"code" gorm:"unique;not null"` // e.g., "SA", "MHS"
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type User struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Name     string `json:"name"`
	Username string `json:"username" gorm:"unique;not null"`
	Email    string `json:"email" gorm:"unique;not null"`
	Password string `json:"-"` // Disembunyikan saat JSON encode
	Faculty  string `json:"faculty"`
	Major    string `json:"major"` // Prodi
	Avatar   string `json:"avatar"`
	Phone    string `json:"phone"` // Nomor HP (opsional)

	// Data Akademik (Optional - untuk mahasiswa)
	UniversityID   *uint         `json:"university_id"` // Nullable
	University     *University   `json:"university,omitempty" gorm:"foreignKey:UniversityID"`
	FacultyID      *uint         `json:"faculty_id"` // Nullable
	FacultyRef     *Faculty      `json:"faculty_ref,omitempty" gorm:"foreignKey:FacultyID"`
	StudyProgramID *uint         `json:"study_program_id"` // Nullable
	StudyProgram   *StudyProgram `json:"study_program,omitempty" gorm:"foreignKey:StudyProgramID"`
	Angkatan       string        `json:"angkatan"` // Tahun angkatan

	// Global Role (Level Aplikasi)
	RoleID uint `json:"role_id"`
	Role   Role `json:"role" gorm:"foreignKey:RoleID"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}
