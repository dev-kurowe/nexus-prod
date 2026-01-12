package helpers

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// VerificationData menyimpan data verifikasi sementara
type VerificationData struct {
	Code           string
	Email          string
	Name           string
	Username       string
	Password       string
	Phone          string
	UniversityID   *uint
	FacultyID      *uint
	StudyProgramID *uint
	Angkatan       string
	ExpiresAt      time.Time
}

// VerificationStore menyimpan kode verifikasi dengan thread-safe map
var (
	verificationStore = make(map[string]*VerificationData)
	verificationMutex = sync.RWMutex{}
)

// GenerateVerificationCode menghasilkan kode verifikasi 6 digit
func GenerateVerificationCode() string {
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

// StoreVerificationCode menyimpan kode verifikasi dengan expiry 5 menit
func StoreVerificationCode(email string, code string, userData map[string]interface{}) {
	verificationMutex.Lock()
	defer verificationMutex.Unlock()

	// Extract ID fields dengan type assertion
	var universityID, facultyID, studyProgramID *uint
	if uniID, ok := userData["university_id"]; ok && uniID != nil {
		if id, ok := uniID.(*uint); ok {
			universityID = id
		}
	}
	if facID, ok := userData["faculty_id"]; ok && facID != nil {
		if id, ok := facID.(*uint); ok {
			facultyID = id
		}
	}
	if spID, ok := userData["study_program_id"]; ok && spID != nil {
		if id, ok := spID.(*uint); ok {
			studyProgramID = id
		}
	}

	verificationStore[email] = &VerificationData{
		Code:           code,
		Email:          email,
		Name:           userData["name"].(string),
		Username:       userData["username"].(string),
		Password:       userData["password"].(string),
		Phone:          getStringOrEmpty(userData, "phone"),
		UniversityID:   universityID,
		FacultyID:      facultyID,
		StudyProgramID: studyProgramID,
		Angkatan:       getStringOrEmpty(userData, "angkatan"),
		ExpiresAt:      time.Now().Add(5 * time.Minute),
	}

	// Cleanup expired codes periodically
	go cleanupExpiredCodes()
}

// Helper function untuk mengambil string dari map atau empty string
func getStringOrEmpty(m map[string]interface{}, key string) string {
	if val, ok := m[key]; ok && val != nil {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

// VerifyCode memverifikasi kode dan mengembalikan data user jika valid
func VerifyCode(email string, code string) (*VerificationData, error) {
	verificationMutex.RLock()
	defer verificationMutex.RUnlock()

	data, exists := verificationStore[email]
	if !exists {
		return nil, fmt.Errorf("kode verifikasi tidak ditemukan atau sudah kadaluarsa")
	}

	if data.Code != code {
		return nil, fmt.Errorf("kode verifikasi tidak sesuai")
	}

	if time.Now().After(data.ExpiresAt) {
		delete(verificationStore, email)
		return nil, fmt.Errorf("kode verifikasi sudah kadaluarsa")
	}

	return data, nil
}

// DeleteVerificationCode menghapus kode verifikasi setelah digunakan
func DeleteVerificationCode(email string) {
	verificationMutex.Lock()
	defer verificationMutex.Unlock()
	delete(verificationStore, email)
}

// cleanupExpiredCodes membersihkan kode yang sudah kadaluarsa
func cleanupExpiredCodes() {
	verificationMutex.Lock()
	defer verificationMutex.Unlock()

	now := time.Now()
	for email, data := range verificationStore {
		if now.After(data.ExpiresAt) {
			delete(verificationStore, email)
		}
	}
}
