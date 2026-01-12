package controllers

import (
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func FindUsers(c *gin.Context) {

	// Inisialisasi slice untuk menampung data user
	var users []models.User

	// Ambil data user dari database
	database.DB.Find(&users)

	// Kirimkan response sukses dengan data user
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Lists Data Users",
		Data:    users,
	})
}

// SearchUsers mencari user berdasarkan email atau nama (untuk autocomplete)
// Query parameter:
// - q: search query (email atau nama)
// - limit: jumlah hasil (default: 10, max: 50)
// - role_ids: filter berdasarkan role_id (format: "1,2,3" atau "1-7" untuk range, "8" untuk panitia lepas)
func SearchUsers(c *gin.Context) {
	// Ambil query parameter
	query := c.Query("q")
	limit := c.DefaultQuery("limit", "10")
	roleIDsParam := c.Query("role_ids") // Format: "1,2,3" atau "1-7" atau "8"

	// Inisialisasi slice untuk menampung data user
	var users []models.User

	// Parse limit
	limitInt := 10
	if parsed, err := strconv.Atoi(limit); err == nil && parsed > 0 && parsed <= 50 {
		limitInt = parsed
	}

	// Query database dengan LIKE search dan preload Role
	dbQuery := database.DB.Preload("Role").Limit(limitInt)

	// Filter berdasarkan role_ids jika diberikan
	if roleIDsParam != "" {
		// Handle format "1-7" untuk range
		if strings.Contains(roleIDsParam, "-") {
			parts := strings.Split(roleIDsParam, "-")
			if len(parts) == 2 {
				start, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
				end, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
				if err1 == nil && err2 == nil && start <= end {
					// Filter role_id dari start sampai end (inclusive)
					dbQuery = dbQuery.Where("role_id >= ? AND role_id <= ?", start, end)
				}
			}
		} else if strings.Contains(roleIDsParam, ",") {
			// Handle format "1,2,3" untuk multiple roles
			roleIDStrs := strings.Split(roleIDsParam, ",")
			var roleIDs []int
			for _, idStr := range roleIDStrs {
				if id, err := strconv.Atoi(strings.TrimSpace(idStr)); err == nil {
					roleIDs = append(roleIDs, id)
				}
			}
			if len(roleIDs) > 0 {
				dbQuery = dbQuery.Where("role_id IN ?", roleIDs)
			}
		} else {
			// Handle single role_id
			if roleID, err := strconv.Atoi(strings.TrimSpace(roleIDsParam)); err == nil {
				dbQuery = dbQuery.Where("role_id = ?", roleID)
			}
		}
	}

	if query != "" {
		// Search berdasarkan email, name, atau username yang mengandung query
		dbQuery = dbQuery.Where("email LIKE ? OR name LIKE ? OR username LIKE ?", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	}

	// Ambil data user dari database (hanya email, name, username, dan role untuk privacy)
	dbQuery.Select("id", "name", "email", "username", "role_id").Find(&users)

	// Kirimkan response sukses dengan data user
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Users found",
		Data:    users,
	})
}

func CreateUser(c *gin.Context) {

	//struct user request
	var req = structs.UserCreateRequest{}

	// Bind JSON request ke struct UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validation Errors",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Inisialisasi user baru
	user := models.User{
		Name:     req.Name,
		Username: req.Username,
		Email:    req.Email,
		Password: helpers.HashPassword(req.Password),
	}

	// Simpan user ke database
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Failed to create user",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Kirimkan response sukses
	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "User created successfully",
		Data: structs.UserResponse{
			Id:        user.ID,
			Name:      user.Name,
			Username:  user.Username,
			Email:     user.Email,
			CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	})

}

func FindUserById(c *gin.Context) {

	// Ambil ID user dari parameter URL
	id := c.Param("id")

	// Inisialisasi user
	var user models.User

	// Cari user berdasarkan ID
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "User not found",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Kirimkan response sukses dengan data user
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "User Found",
		Data: structs.UserResponse{
			Id:        user.ID,
			Name:      user.Name,
			Username:  user.Username,
			Email:     user.Email,
			CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	})

}

func UpdateUser(c *gin.Context) {

	// Ambil ID user dari parameter URL
	id := c.Param("id")

	// Inisialisasi user
	var user models.User

	// Cari user berdasarkan ID
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "User not found",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	//struct user request
	var req = structs.UserUpdateRequest{}

	// Bind JSON request ke struct UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validation Errors",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Update user dengan data baru
	user.Name = req.Name
	user.Username = req.Username
	user.Email = req.Email
	user.Password = helpers.HashPassword(req.Password)

	// Simpan perubahan ke database
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Failed to update user",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Kirimkan response sukses
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "User updated successfully",
		Data: structs.UserResponse{
			Id:        user.ID,
			Name:      user.Name,
			Username:  user.Username,
			Email:     user.Email,
			CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	})
}

func DeleteUser(c *gin.Context) {

	// Ambil ID user dari parameter URL
	id := c.Param("id")

	// Inisialisasi user
	var user models.User

	// Cari user berdasarkan ID
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "User not found",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Hapus user dari database
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Failed to delete user",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Kirimkan response sukses
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "User deleted successfully",
	})
}

// ==== User Self-Service: Update Profile & Change Password ====

type UpdateProfileRequest struct {
	Name         string `json:"name" binding:"required"`
	Phone        string `json:"phone"`
	UniversityID *uint  `json:"university_id"`
	Angkatan     string `json:"angkatan"`
	Faculty      string `json:"faculty"`
	Major        string `json:"major"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// PUT /api/user/profile
func UpdateProfile(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	// Konversi ID dari token (bisa float64 dari JWT)
	var userID uint
	switch v := userIDInterface.(type) {
	case float64:
		userID = uint(v)
	case int:
		userID = uint(v)
	case uint:
		userID = v
	case string:
		if parsed, err := strconv.Atoi(v); err == nil {
			userID = uint(parsed)
		}
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Nama wajib diisi"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User tidak ditemukan"})
		return
	}

	// Update all fields
	user.Name = req.Name
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.UniversityID != nil {
		user.UniversityID = req.UniversityID
	}
	if req.Angkatan != "" {
		user.Angkatan = req.Angkatan
	}
	if req.Faculty != "" {
		user.Faculty = req.Faculty
	}
	if req.Major != "" {
		user.Major = req.Major
	}

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal memperbarui profil"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profil berhasil diperbarui",
		"data": gin.H{
			"id":     user.ID,
			"name":   user.Name,
			"email":  user.Email,
			"role":   user.Role,
			"avatar": user.Avatar,
		},
	})
}

// PUT /api/user/avatar
type UpdateAvatarRequest struct {
	Avatar string `json:"avatar"`
}

func UpdateAvatar(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	var userID uint
	switch v := userIDInterface.(type) {
	case float64:
		userID = uint(v)
	case int:
		userID = uint(v)
	case uint:
		userID = v
	case string:
		if parsed, err := strconv.Atoi(v); err == nil {
			userID = uint(parsed)
		}
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User tidak ditemukan"})
		return
	}

	// Parse JSON request
	var req UpdateAvatarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid"})
		return
	}

	// Update user avatar in database (URL dari DiceBear atau kosong)
	user.Avatar = req.Avatar
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal memperbarui avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Avatar berhasil diperbarui",
		"data": gin.H{
			"avatar": user.Avatar,
		},
	})
}

// DELETE /api/user/avatar
func DeleteAvatar(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	var userID uint
	switch v := userIDInterface.(type) {
	case float64:
		userID = uint(v)
	case int:
		userID = uint(v)
	case uint:
		userID = v
	case string:
		if parsed, err := strconv.Atoi(v); err == nil {
			userID = uint(parsed)
		}
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User tidak ditemukan"})
		return
	}

	// Clear avatar
	user.Avatar = ""
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menghapus avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Avatar berhasil dihapus",
	})
}

// PUT /api/user/password
func ChangePassword(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	var userID uint
	switch v := userIDInterface.(type) {
	case float64:
		userID = uint(v)
	case int:
		userID = uint(v)
	case uint:
		userID = v
	case string:
		if parsed, err := strconv.Atoi(v); err == nil {
			userID = uint(parsed)
		}
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User tidak ditemukan"})
		return
	}

	// Cek password lama
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Password lama salah"})
		return
	}

	// Hash password baru
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menghash password"})
		return
	}

	user.Password = string(hashed)
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengganti password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password berhasil diganti",
	})
}
