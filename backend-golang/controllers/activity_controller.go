package controllers

import (
	"fmt"
	"log"
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/models"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GetRecentActivities mengambil aktivitas terbaru HANYA dari event yang user ikuti dan event masih aktif (status != "done")
func GetRecentActivities(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")

	// Ambil User ID dari Token (Pastikan user login)
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	// Konversi interface{} ke uint dengan aman
	var userID uint
	switch v := userIDInterface.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	case int:
		userID = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error user ID format"})
		return
	}

	// Parse limit to int
	limit := 10
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Cek apakah user adalah Super Admin
	var user models.User
	if err := database.DB.Preload("Role").First(&user, userID).Error; err != nil {
		log.Printf("Error fetching user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data user",
			"error":   err.Error(),
		})
		return
	}

	// Ambil semua activities, lalu filter berdasarkan:
	// 1. Activity dari event yang user ikuti (sebagai panitia atau peserta) - UNTUK USER BIASA
	// 2. Activity dari SEMUA event aktif (status != "done") - UNTUK SUPER ADMIN
	var activities []models.Activity

	// Cek apakah user adalah Super Admin
	// Berdasarkan tabel roles: code = "superadmin", name = "Super Administrator"
	roleCodeLower := strings.ToLower(user.Role.Code)
	roleNameUpper := strings.ToUpper(user.Role.Name)
	isSuperAdmin := roleCodeLower == "superadmin" ||
		strings.Contains(roleNameUpper, "SUPER ADMIN") ||
		strings.Contains(roleNameUpper, "SUPERADMIN")

	if isSuperAdmin {
		// SUPER ADMIN: Tampilkan semua activity dari event aktif (status != "done")
		log.Printf("User %s is Super Admin - showing all activities from active events", user.Name)
		if err := database.DB.Model(&models.Activity{}).
			Preload("User").
			Where(`
				(entity_type = 'event' AND entity_id IN (SELECT id FROM events WHERE status != 'done'))
				OR
				(entity_type = 'task' AND entity_id IN (SELECT tasks.id FROM tasks INNER JOIN events e ON tasks.event_id = e.id WHERE e.status != 'done'))
				OR
				(entity_type = 'registration' AND entity_id IN (SELECT r.id FROM registrations r INNER JOIN events e ON r.event_id = e.id WHERE e.status != 'done'))
			`).
			Order("created_at DESC").
			Limit(limit).
			Find(&activities).Error; err != nil {
			log.Printf("Error fetching activities: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal mengambil aktivitas",
				"error":   err.Error(),
			})
			return
		}
	} else {
		// USER BIASA: Hanya activity dari event yang user ikuti (sebagai panitia atau peserta) dan event status != "done"
		log.Printf("User %s is regular user - showing activities from involved events only", user.Name)
		if err := database.DB.Model(&models.Activity{}).
			Preload("User").
			Where(`
				(entity_type = 'event' AND entity_id IN (SELECT cm.event_id FROM committee_members cm INNER JOIN events e ON cm.event_id = e.id WHERE cm.user_id = ? AND e.status != 'done'))
				OR
				(entity_type = 'event' AND entity_id IN (SELECT r.event_id FROM registrations r INNER JOIN events e ON r.event_id = e.id WHERE r.user_id = ? AND e.status != 'done'))
				OR
				(entity_type = 'task' AND entity_id IN (SELECT tasks.id FROM tasks INNER JOIN events e ON tasks.event_id = e.id INNER JOIN committee_members cm ON e.id = cm.event_id WHERE cm.user_id = ? AND e.status != 'done'))
				OR
				(entity_type = 'registration' AND entity_id IN (SELECT r.id FROM registrations r INNER JOIN events e ON r.event_id = e.id INNER JOIN committee_members cm ON e.id = cm.event_id WHERE cm.user_id = ? AND e.status != 'done'))
				OR
				(entity_type = 'registration' AND entity_id IN (SELECT r.id FROM registrations r INNER JOIN events e ON r.event_id = e.id WHERE r.user_id = ? AND e.status != 'done'))
			`, userID, userID, userID, userID, userID).
			Order("created_at DESC").
			Limit(limit).
			Find(&activities).Error; err != nil {
			log.Printf("Error fetching activities: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal mengambil aktivitas",
				"error":   err.Error(),
			})
			return
		}
	}

	// Debug logging
	fmt.Printf("=== GET RECENT ACTIVITIES ===\n")
	fmt.Printf("User ID: %d\n", userID)
	fmt.Printf("Limit: %d\n", limit)
	fmt.Printf("Activities found: %d\n", len(activities))
	for i, act := range activities {
		fmt.Printf("  [%d] ID: %d, User: %s, Type: %s, EntityType: %s, EntityID: %d, Desc: %s\n",
			i+1, act.ID, act.User.Name, act.ActivityType, act.EntityType, act.EntityID, act.Description)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Recent activities",
		"data":    activities,
	})
}

// GetAllActivities mengambil semua aktivitas (khusus superadmin)
func GetAllActivities(c *gin.Context) {
	// Cek superadmin
	userID, _ := c.Get("id")
	var user models.User
	database.DB.First(&user, userID)
	if user.RoleID != 1 {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Akses ditolak. Hanya superadmin yang bisa mengakses.",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	// Filter
	activityType := c.Query("type")
	entityType := c.Query("entity_type")
	search := c.Query("search")

	query := database.DB.Model(&models.Activity{}).Preload("User")

	if activityType != "" {
		query = query.Where("activity_type = ?", activityType)
	}
	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("description LIKE ?", like)
	}

	var total int64
	query.Count(&total)

	var activities []models.Activity
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&activities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil aktivitas",
		})
		return
	}

	// Statistik
	var todayCount int64
	database.DB.Model(&models.Activity{}).Where("DATE(created_at) = CURDATE()").Count(&todayCount)

	var typeStats []struct {
		ActivityType string `json:"activity_type"`
		Count        int64  `json:"count"`
	}
	database.DB.Model(&models.Activity{}).
		Select("activity_type, COUNT(*) as count").
		Group("activity_type").
		Scan(&typeStats)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Berhasil mengambil aktivitas",
		"data": gin.H{
			"activities":  activities,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
			"today_count": todayCount,
			"type_stats":  typeStats,
		},
	})
}

// Helper function untuk membuat activity log
func CreateActivity(userID uint, activityType string, entityType string, entityID uint, description string) {
	activity := models.Activity{
		UserID:       userID,
		ActivityType: activityType,
		EntityType:   entityType,
		EntityID:     entityID,
		Description:  description,
		CreatedAt:    time.Now(),
	}
	if err := database.DB.Create(&activity).Error; err != nil {
		log.Printf("Error creating activity log: %v", err)
	} else {
		fmt.Printf("Activity created: UserID=%d, Type=%s, Desc=%s\n", userID, activityType, description)
	}
}
