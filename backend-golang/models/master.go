package models

import (
	"time"

	"gorm.io/gorm"
)

// Master Universitas
type University struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Name      string         `json:"name" gorm:"size:255;not null"`
	Code      string         `json:"code" gorm:"size:50;unique;not null"`
	Address   string         `json:"address" gorm:"type:text"`
	Phone     string         `json:"phone" gorm:"size:20"`
	Website   string         `json:"website" gorm:"size:255"`
	Logo      string         `json:"logo" gorm:"size:255"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// Master Fakultas
type Faculty struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	UniversityID uint           `json:"university_id"`
	Name         string         `json:"name" gorm:"size:255;not null"`
	Code         string         `json:"code" gorm:"size:50;unique;not null"`
	Description  string         `json:"description" gorm:"type:text"`
	University   University     `json:"university" gorm:"foreignKey:UniversityID"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// Master Program Studi (Prodi)
type StudyProgram struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	FacultyID     uint           `json:"faculty_id"`
	Name          string         `json:"name" gorm:"size:255;not null"`
	Code          string         `json:"code" gorm:"size:50;unique;not null"`
	Level         string         `json:"level" gorm:"size:50"`         // S1, S2, S3, D3, D4
	Accreditation string         `json:"accreditation" gorm:"size:10"` // A, B, C, Unggul
	Faculty       Faculty        `json:"faculty" gorm:"foreignKey:FacultyID"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// Master Mahasiswa
type Student struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	NIM            string         `json:"nim" gorm:"size:50;unique;not null"`
	Name           string         `json:"name" gorm:"size:255;not null"`
	Email          string         `json:"email" gorm:"size:255;unique;not null"`
	Phone          string         `json:"phone" gorm:"size:20"`
	StudyProgramID uint           `json:"study_program_id"`
	Batch          string         `json:"batch" gorm:"size:10"`                   // Angkatan
	Status         string         `json:"status" gorm:"size:50;default:'active'"` // active, alumni, inactive
	Address        string         `json:"address" gorm:"type:text"`
	StudyProgram   StudyProgram   `json:"study_program" gorm:"foreignKey:StudyProgramID"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// Master Ormawa (Organisasi Mahasiswa)
type Organization struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"size:255;not null"`
	Code        string         `json:"code" gorm:"size:50;unique;not null"`
	Type        string         `json:"type" gorm:"size:50"` // Himpunan, UKM, BEM, dll
	FacultyID   *uint          `json:"faculty_id"`          // Null jika tingkat universitas
	Description string         `json:"description" gorm:"type:text"`
	Logo        string         `json:"logo" gorm:"size:255"`
	Faculty     *Faculty       `json:"faculty,omitempty" gorm:"foreignKey:FacultyID"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}
