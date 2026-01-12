package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Helper untuk mencatat audit log
func CreateAuditLog(userID uint, action, entityType string, entityID uint, oldValue, newValue interface{}, description, ipAddress, userAgent string) {
	var oldJSON, newJSON string

	if oldValue != nil {
		if bytes, err := json.Marshal(oldValue); err == nil {
			oldJSON = string(bytes)
		}
	}

	if newValue != nil {
		if bytes, err := json.Marshal(newValue); err == nil {
			newJSON = string(bytes)
		}
	}

	auditLog := models.AuditLog{
		UserID:      userID,
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		OldValue:    oldJSON,
		NewValue:    newJSON,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		Description: description,
	}

	if err := database.DB.Create(&auditLog).Error; err != nil {
		log.Printf("Error creating audit log: %v", err)
	}
}

// GetAuditLogs mengambil semua audit logs dengan pagination
func GetAuditLogs(c *gin.Context) {
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

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	// Filter
	action := c.Query("action")
	entityType := c.Query("entity_type")
	search := c.Query("search")

	query := database.DB.Model(&models.AuditLog{}).Preload("User")

	if action != "" {
		query = query.Where("action = ?", action)
	}
	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("description LIKE ? OR ip_address LIKE ?", like, like)
	}

	var total int64
	query.Count(&total)

	var logs []models.AuditLog
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil audit logs",
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Berhasil mengambil audit logs",
		Data: gin.H{
			"logs":        logs,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetAuditLogStats mendapatkan statistik audit log
func GetAuditLogStats(c *gin.Context) {
	// Cek superadmin
	userID, _ := c.Get("id")
	var user models.User
	database.DB.First(&user, userID)
	if user.RoleID != 1 {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Akses ditolak",
		})
		return
	}

	// Statistik per action
	var actionStats []struct {
		Action string `json:"action"`
		Count  int64  `json:"count"`
	}
	database.DB.Model(&models.AuditLog{}).
		Select("action, COUNT(*) as count").
		Group("action").
		Scan(&actionStats)

	// Statistik per entity type
	var entityStats []struct {
		EntityType string `json:"entity_type"`
		Count      int64  `json:"count"`
	}
	database.DB.Model(&models.AuditLog{}).
		Select("entity_type, COUNT(*) as count").
		Where("entity_type != ''").
		Group("entity_type").
		Scan(&entityStats)

	// Total logs
	var totalLogs int64
	database.DB.Model(&models.AuditLog{}).Count(&totalLogs)

	// Logs hari ini
	var todayLogs int64
	database.DB.Model(&models.AuditLog{}).
		Where("DATE(created_at) = CURDATE()").
		Count(&todayLogs)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Berhasil mengambil statistik",
		Data: gin.H{
			"action_stats": actionStats,
			"entity_stats": entityStats,
			"total_logs":   totalLogs,
			"today_logs":   todayLogs,
		},
	})
}
