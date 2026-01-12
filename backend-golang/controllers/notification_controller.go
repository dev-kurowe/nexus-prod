package controllers

import (
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetNotifications mengambil daftar notifikasi user
func GetNotifications(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
		})
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
	}

	// Query params
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	unreadOnly := c.Query("unread_only") == "true"

	offset := (page - 1) * limit

	var notifications []models.Notification
	var total int64

	query := database.DB.Where("user_id = ?", userID)
	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}

	// Count total
	query.Model(&models.Notification{}).Count(&total)

	// Get notifications with pagination
	if err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil notifikasi",
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Daftar notifikasi",
		Data: gin.H{
			"notifications": notifications,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// GetUnreadCount mengambil jumlah notifikasi yang belum dibaca
func GetUnreadCount(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
		})
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
	}

	var unreadCount int64
	var totalCount int64

	database.DB.Model(&models.Notification{}).Where("user_id = ?", userID).Count(&totalCount)
	database.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&unreadCount)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Jumlah notifikasi",
		Data: models.NotificationSummary{
			UnreadCount: int(unreadCount),
			TotalCount:  int(totalCount),
		},
	})
}

// MarkAsRead menandai notifikasi sebagai sudah dibaca
func MarkAsRead(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
		})
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
	}

	notifID := c.Param("id")

	var notification models.Notification
	if err := database.DB.Where("id = ? AND user_id = ?", notifID, userID).First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Notifikasi tidak ditemukan",
		})
		return
	}

	now := time.Now()
	notification.IsRead = true
	notification.ReadAt = &now

	if err := database.DB.Save(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal update notifikasi",
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Notifikasi ditandai sudah dibaca",
		Data:    notification,
	})
}

// MarkAllAsRead menandai semua notifikasi sebagai sudah dibaca
func MarkAllAsRead(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
		})
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
	}

	now := time.Now()
	result := database.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal update notifikasi",
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Semua notifikasi ditandai sudah dibaca",
		Data: gin.H{
			"updated_count": result.RowsAffected,
		},
	})
}

// DeleteNotification menghapus notifikasi
func DeleteNotification(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
		})
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
	}

	notifID := c.Param("id")

	result := database.DB.Where("id = ? AND user_id = ?", notifID, userID).Delete(&models.Notification{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus notifikasi",
		})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Notifikasi tidak ditemukan",
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Notifikasi berhasil dihapus",
	})
}

// ClearAllNotifications menghapus semua notifikasi user
func ClearAllNotifications(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
		})
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
	}

	result := database.DB.Where("user_id = ?", userID).Delete(&models.Notification{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus notifikasi",
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Semua notifikasi berhasil dihapus",
		Data: gin.H{
			"deleted_count": result.RowsAffected,
		},
	})
}
