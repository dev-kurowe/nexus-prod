package controllers

import (
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"
	"strconv"

	"github.com/gin-gonic/gin"
)

// InitializeDefaultSettings menginisialisasi default settings jika belum ada
func InitializeDefaultSettings() {
	var count int64
	database.DB.Model(&models.SystemSetting{}).Count(&count)

	if count == 0 {
		for _, setting := range models.DefaultSettings {
			database.DB.Create(&setting)
		}
	}
}

// GetSystemSettings mengambil semua pengaturan sistem
func GetSystemSettings(c *gin.Context) {
	// Cek superadmin
	userID, _ := c.Get("id")
	var user models.User
	database.DB.First(&user, userID)
	if user.RoleID != 1 {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Akses ditolak. Hanya superadmin yang bisa mengakses.",
		})
		return
	}

	// Auto-initialize default settings jika kosong
	var count int64
	database.DB.Model(&models.SystemSetting{}).Count(&count)
	if count == 0 {
		InitializeDefaultSettings()
	}

	category := c.Query("category")

	query := database.DB.Model(&models.SystemSetting{}).Preload("User")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var settings []models.SystemSetting
	if err := query.Order("category, `key`").Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil pengaturan sistem",
		})
		return
	}

	// Group by category
	grouped := make(map[string][]models.SystemSetting)
	for _, s := range settings {
		grouped[s.Category] = append(grouped[s.Category], s)
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Berhasil mengambil pengaturan sistem",
		Data: gin.H{
			"settings": settings,
			"grouped":  grouped,
		},
	})
}

// UpdateSystemSetting mengupdate pengaturan sistem
func UpdateSystemSetting(c *gin.Context) {
	// Cek superadmin
	userIDInterface, _ := c.Get("id")
	var userID uint
	switch v := userIDInterface.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	case int:
		userID = uint(v)
	}

	var user models.User
	database.DB.First(&user, userID)
	if user.RoleID != 1 {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Akses ditolak. Hanya superadmin yang bisa mengakses.",
		})
		return
	}

	settingID := c.Param("id")

	var setting models.SystemSetting
	if err := database.DB.First(&setting, settingID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Pengaturan tidak ditemukan",
		})
		return
	}

	var req struct {
		Value string `json:"value"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Format request tidak valid",
		})
		return
	}

	// Simpan nilai lama untuk audit
	oldValue := setting.Value

	setting.Value = req.Value
	setting.UpdatedBy = &userID

	if err := database.DB.Save(&setting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate pengaturan",
		})
		return
	}

	// Catat audit log
	CreateAuditLog(
		userID,
		"update",
		"system_setting",
		setting.ID,
		gin.H{"key": setting.Key, "value": oldValue},
		gin.H{"key": setting.Key, "value": req.Value},
		"Mengubah pengaturan "+setting.Key,
		c.ClientIP(),
		c.Request.UserAgent(),
	)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Pengaturan berhasil diupdate",
		Data:    setting,
	})
}

// BulkUpdateSystemSettings update banyak pengaturan sekaligus
func BulkUpdateSystemSettings(c *gin.Context) {
	// Cek superadmin
	userIDInterface, _ := c.Get("id")
	var userID uint
	switch v := userIDInterface.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	case int:
		userID = uint(v)
	}

	var user models.User
	database.DB.First(&user, userID)
	if user.RoleID != 1 {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Akses ditolak",
		})
		return
	}

	var req struct {
		Settings []struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		} `json:"settings"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Format request tidak valid",
		})
		return
	}

	tx := database.DB.Begin()

	for _, s := range req.Settings {
		var setting models.SystemSetting
		if err := tx.Where("`key` = ?", s.Key).First(&setting).Error; err != nil {
			continue
		}

		oldValue := setting.Value
		setting.Value = s.Value
		setting.UpdatedBy = &userID

		if err := tx.Save(&setting).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
				Success: false,
				Message: "Gagal mengupdate pengaturan " + s.Key,
			})
			return
		}

		// Audit log
		CreateAuditLog(
			userID,
			"update",
			"system_setting",
			setting.ID,
			gin.H{"key": s.Key, "value": oldValue},
			gin.H{"key": s.Key, "value": s.Value},
			"Mengubah pengaturan "+s.Key,
			c.ClientIP(),
			c.Request.UserAgent(),
		)
	}

	tx.Commit()

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Pengaturan berhasil diupdate",
	})
}

// GetPublicSettings mengambil pengaturan yang bersifat publik
func GetPublicSettings(c *gin.Context) {
	var settings []models.SystemSetting
	database.DB.Where("is_public = ?", true).Find(&settings)

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Data:    result,
	})
}

// GetSettingByKey mengambil satu setting berdasarkan key
func GetSettingByKey(key string) string {
	var setting models.SystemSetting
	if err := database.DB.Where("`key` = ?", key).First(&setting).Error; err != nil {
		return ""
	}
	return setting.Value
}

// GetSettingByKeyBool mengambil setting boolean
func GetSettingByKeyBool(key string) bool {
	value := GetSettingByKey(key)
	return value == "true" || value == "1"
}

// GetSettingByKeyInt mengambil setting integer
func GetSettingByKeyInt(key string) int {
	value := GetSettingByKey(key)
	if i, err := strconv.Atoi(value); err == nil {
		return i
	}
	return 0
}
