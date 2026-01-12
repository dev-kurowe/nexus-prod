package helpers

import (
	"santrikoding/backend-api/config"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Nilai secret diambil dari environment variable JWT_SECRET
var jwtKey = []byte(config.GetEnv("JWT_SECRET", "secret_key"))

// UBAH PARAMETER: dari (username string) menjadi (userID uint)
func GenerateToken(userID uint) string {

	// Mengatur waktu kedaluwarsa token (30 menit)
	expirationTime := time.Now().Add(30 * time.Minute)

	// GANTI KE MapClaims
	// Agar "sub" bisa menyimpan Angka (ID), bukan String
	claims := jwt.MapClaims{
		"sub": userID,                             // Simpan ID User (Angka)
		"exp": jwt.NewNumericDate(expirationTime), // Expired time
	}

	// Membuat token baru dengan klaim yang telah dibuat
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Tanda tangani token
	tokenString, _ := token.SignedString(config.JWT_KEY)

	return tokenString
}
