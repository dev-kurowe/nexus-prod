package middlewares

import (
	"net/http"
	"santrikoding/backend-api/config" // PENTING: Import Config Global
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		// 1. Ambil header Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token is required"})
			return
		}

		// 2. Cek Format Bearer
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			return
		}

		tokenString := parts[1]

		// 3. Parse Token
		// Kita gunakan jwt.Parse (bukan ParseWithClaims) agar lebih fleksibel
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validasi Algoritma Enkripsi
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}

			// PENTING: Gunakan Kunci dari Config Global (Biar sinkron sama Helper)
			return config.JWT_KEY, nil
		})

		// 4. Cek Validitas Token
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token", "details": err.Error()})
			return
		}

		// 5. Ambil Data "sub" (ID User) dari Claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// JWT menyimpan angka sebagai float64 secara default
			// Kita harus ubah ke uint agar bisa dipakai database
			if sub, ok := claims["sub"].(float64); ok {
				// SUKSES: Simpan ID ke Context dengan nama "id"
				c.Set("id", uint(sub))
			} else {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
				return
			}
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		c.Next()
	}
}
