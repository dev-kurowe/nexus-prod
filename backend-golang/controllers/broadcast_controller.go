package controllers

import (
	"fmt"
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetBroadcasts mengambil semua broadcast (untuk admin)
func GetBroadcasts(c *gin.Context) {
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
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	var total int64
	database.DB.Model(&models.Broadcast{}).Count(&total)

	var broadcasts []models.Broadcast
	if err := database.DB.Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&broadcasts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil broadcast",
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Berhasil mengambil broadcast",
		Data: gin.H{
			"broadcasts":  broadcasts,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// CreateBroadcast membuat broadcast baru
func CreateBroadcast(c *gin.Context) {
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

	var req struct {
		Title      string `json:"title" binding:"required"`
		Message    string `json:"message" binding:"required"`
		Type       string `json:"type"`        // info, warning, success, danger
		TargetRole string `json:"target_role"` // all, specific role
		SendEmail  bool   `json:"send_email"`
		SendPush   bool   `json:"send_push"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Format request tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	if req.Type == "" {
		req.Type = "info"
	}

	// Hitung total target user
	var totalTarget int64
	userQuery := database.DB.Model(&models.User{})
	if req.TargetRole != "" && req.TargetRole != "all" {
		userQuery = userQuery.Joins("JOIN roles ON roles.id = users.role_id").
			Where("roles.code = ?", req.TargetRole)
	}
	userQuery.Count(&totalTarget)

	now := time.Now()
	broadcast := models.Broadcast{
		Title:       req.Title,
		Message:     req.Message,
		Type:        req.Type,
		TargetRole:  req.TargetRole,
		SendEmail:   req.SendEmail,
		SendPush:    req.SendPush,
		SentAt:      &now,
		SentBy:      userID,
		TotalTarget: int(totalTarget),
	}

	if err := database.DB.Create(&broadcast).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal membuat broadcast",
		})
		return
	}

	// Kirim notifikasi ke semua user target
	go sendBroadcastNotifications(broadcast, req.TargetRole)

	// Audit log
	CreateAuditLog(
		userID,
		"create",
		"broadcast",
		broadcast.ID,
		nil,
		broadcast,
		fmt.Sprintf("Mengirim broadcast: %s", req.Title),
		c.ClientIP(),
		c.Request.UserAgent(),
	)

	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Broadcast berhasil dikirim",
		Data:    broadcast,
	})
}

// sendBroadcastNotifications mengirim notifikasi ke semua user target
func sendBroadcastNotifications(broadcast models.Broadcast, targetRole string) {
	var users []models.User

	query := database.DB.Model(&models.User{})
	if targetRole != "" && targetRole != "all" {
		query = query.Joins("JOIN roles ON roles.id = users.role_id").
			Where("roles.code = ?", targetRole)
	}
	query.Find(&users)

	for _, u := range users {
		helpers.CreateNotification(
			u.ID,
			models.NotificationType(broadcast.Type+"_broadcast"),
			broadcast.Title,
			broadcast.Message,
			"broadcast",
			broadcast.ID,
			"/dashboard/notifications",
		)
	}
}

// GetUserBroadcasts mengambil broadcast untuk user (yang belum dibaca)
func GetUserBroadcasts(c *gin.Context) {
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
	database.DB.Preload("Role").First(&user, userID)

	// Ambil broadcast yang relevan untuk user
	var broadcasts []models.Broadcast
	query := database.DB.Where("target_role = '' OR target_role = 'all' OR target_role = ?", user.Role.Code)
	query.Order("created_at DESC").Limit(10).Find(&broadcasts)

	// Mark mana yang sudah dibaca
	var readIDs []uint
	database.DB.Model(&models.BroadcastRead{}).
		Where("user_id = ?", userID).
		Pluck("broadcast_id", &readIDs)

	readMap := make(map[uint]bool)
	for _, id := range readIDs {
		readMap[id] = true
	}

	type BroadcastWithRead struct {
		models.Broadcast
		IsRead bool `json:"is_read"`
	}

	var result []BroadcastWithRead
	for _, b := range broadcasts {
		result = append(result, BroadcastWithRead{
			Broadcast: b,
			IsRead:    readMap[b.ID],
		})
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Data:    result,
	})
}

// MarkBroadcastRead menandai broadcast sudah dibaca
func MarkBroadcastRead(c *gin.Context) {
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

	broadcastID, _ := strconv.ParseUint(c.Param("id"), 10, 32)

	// Cek apakah sudah pernah dibaca
	var existing models.BroadcastRead
	if database.DB.Where("broadcast_id = ? AND user_id = ?", broadcastID, userID).First(&existing).Error == nil {
		c.JSON(http.StatusOK, structs.SuccessResponse{
			Success: true,
			Message: "Broadcast sudah ditandai dibaca",
		})
		return
	}

	read := models.BroadcastRead{
		BroadcastID: uint(broadcastID),
		UserID:      userID,
		ReadAt:      time.Now(),
	}

	if err := database.DB.Create(&read).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menandai broadcast",
		})
		return
	}

	// Update read count
	database.DB.Model(&models.Broadcast{}).
		Where("id = ?", broadcastID).
		UpdateColumn("read_count", database.DB.Raw("read_count + 1"))

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Broadcast ditandai sudah dibaca",
	})
}

// DeleteBroadcast menghapus broadcast
func DeleteBroadcast(c *gin.Context) {
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

	broadcastID := c.Param("id")

	var broadcast models.Broadcast
	if err := database.DB.First(&broadcast, broadcastID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Broadcast tidak ditemukan",
		})
		return
	}

	if err := database.DB.Delete(&broadcast).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus broadcast",
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Broadcast berhasil dihapus",
	})
}

// GetBroadcastStats mendapatkan statistik broadcast
func GetBroadcastStats(c *gin.Context) {
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

	var totalBroadcasts int64
	database.DB.Model(&models.Broadcast{}).Count(&totalBroadcasts)

	var totalReads int64
	database.DB.Model(&models.BroadcastRead{}).Count(&totalReads)

	// Broadcast bulan ini
	var thisMonthBroadcasts int64
	database.DB.Model(&models.Broadcast{}).
		Where("MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())").
		Count(&thisMonthBroadcasts)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Data: gin.H{
			"total_broadcasts":      totalBroadcasts,
			"total_reads":           totalReads,
			"this_month_broadcasts": thisMonthBroadcasts,
		},
	})
}
