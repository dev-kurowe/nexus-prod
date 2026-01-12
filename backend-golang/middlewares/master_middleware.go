package middlewares

import (
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"

	"github.com/gin-gonic/gin"
)

// MasterAccessMiddleware - Hanya superadmin (ID 1) atau ketua himpunan yang bisa akses
func MasterAccessMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from JWT context (set by AuthMiddleware)
		userID, exists := c.Get("id")
		if !exists {
			c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
				Success: false,
				Message: "Unauthorized",
				Errors:  map[string]string{"error": "User ID not found in token"},
			})
			c.Abort()
			return
		}

		// Convert to uint
		id := userID.(uint)

		// Superadmin dengan ID 1 langsung lolos
		if id == 1 {
			c.Next()
			return
		}

		// Cek apakah user adalah ketua himpunan
		var user models.User
		if err := database.DB.Preload("Role").Where("id = ?", id).First(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
				Success: false,
				Message: "Gagal mengambil data user",
				Errors:  map[string]string{"error": err.Error()},
			})
			c.Abort()
			return
		}

		// Cek role - hanya "ketua himpunan" yang bisa akses
		if user.Role.Name != "ketua himpunan" {
			c.JSON(http.StatusForbidden, structs.ErrorResponse{
				Success: false,
				Message: "Akses ditolak",
				Errors:  map[string]string{"error": "Hanya superadmin atau ketua himpunan yang dapat mengakses menu ini"},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
