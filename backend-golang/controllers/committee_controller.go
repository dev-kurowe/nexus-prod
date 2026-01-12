package controllers

import (
	"log"
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"

	"github.com/gin-gonic/gin"
)

type AddMemberRequest struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role" binding:"required"` // Divisi/Jabatan (gabungan)
}

// GetCommitteeMembers mengambil daftar panitia berdasarkan event_id
func GetCommitteeMembers(c *gin.Context) {
	eventID := c.Param("event_id")

	var committeeMembers []models.CommitteeMember

	// Ambil data dengan preload User untuk dapat detail user
	if err := database.DB.Preload("User").Where("event_id = ?", eventID).Find(&committeeMembers).Error; err != nil {
		log.Printf("Error fetching committee members: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data panitia",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Daftar panitia event",
		Data:    committeeMembers,
	})
}

// AddCommitteeMember menambahkan panitia baru ke event
func AddCommitteeMember(c *gin.Context) {
	eventID := c.Param("event_id")
	var req AddMemberRequest

	// Validasi request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validasi Errors",
			Errors:  map[string]string{"error": "Email dan Divisi/Jabatan wajib diisi"},
		})
		return
	}

	// Cek apakah event ada
	var event models.Event
	if err := database.DB.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Event tidak ditemukan",
			Errors:  map[string]string{"error": "Event not found"},
		})
		return
	}

	// Cari user berdasarkan email
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "User dengan email tersebut belum terdaftar",
			Errors:  map[string]string{"email": "User tidak ditemukan dengan email: " + req.Email},
		})
		return
	}

	// Cek apakah user sudah menjadi panitia di event ini
	var existingMember models.CommitteeMember
	if err := database.DB.Where("event_id = ? AND user_id = ?", eventID, user.ID).First(&existingMember).Error; err == nil {
		c.JSON(http.StatusConflict, structs.ErrorResponse{
			Success: false,
			Message: "User ini sudah menjadi panitia di event ini",
			Errors:  map[string]string{"email": "User sudah terdaftar sebagai panitia"},
		})
		return
	}

	// Buat committee member baru
	// Role (Divisi/Jabatan) diisi ke Position, Division dikosongkan atau diisi sama
	committeeMember := models.CommitteeMember{
		EventID:  event.ID,
		UserID:   user.ID,
		Division: "-",      // Tidak digunakan lagi, bisa dikosongkan
		Position: req.Role, // Divisi/Jabatan disimpan di Position
	}

	// Simpan ke database
	if err := database.DB.Create(&committeeMember).Error; err != nil {
		log.Printf("Error creating committee member: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menambahkan panitia",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Preload user untuk response
	database.DB.Preload("User").First(&committeeMember, committeeMember.ID)

	// Kirim notifikasi ke user yang ditambahkan sebagai panitia
	go helpers.NotifyCommitteeAdded(user.ID, event.Title, req.Role, event.Slug)

	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Panitia berhasil ditambahkan",
		Data:    committeeMember,
	})
}

// RemoveCommitteeMember menghapus panitia dari event
func RemoveCommitteeMember(c *gin.Context) {
	memberID := c.Param("member_id")

	// Cek apakah member ada
	var member models.CommitteeMember
	if err := database.DB.First(&member, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Data panitia tidak ditemukan",
			Errors:  map[string]string{"error": "Committee member not found"},
		})
		return
	}

	// Hapus dari database
	if err := database.DB.Delete(&member).Error; err != nil {
		log.Printf("Error deleting committee member: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus panitia",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Panitia berhasil dihapus",
		Data:    nil,
	})
}

// GetUserCommitteeStatus mengecek apakah user (role 8) adalah panitia di event aktif
// Mengembalikan daftar event yang user menjadi panitia dan statusnya
func GetUserCommitteeStatus(c *gin.Context) {
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
			Errors:  map[string]string{"error": "User not authenticated"},
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

	// Ambil user untuk cek role
	var user models.User
	if err := database.DB.Preload("Role").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "User tidak ditemukan",
			Errors:  map[string]string{"error": "User not found"},
		})
		return
	}

	// Cek apakah user role_id = 8 (Mahasiswa)
	if user.RoleID != 8 {
		c.JSON(http.StatusOK, structs.SuccessResponse{
			Success: true,
			Message: "User bukan mahasiswa, tidak perlu cek status panitia",
			Data: map[string]interface{}{
				"is_committee":         false,
				"active_events":        []interface{}{},
				"show_admin_dashboard": false,
			},
		})
		return
	}

	// Cari semua event yang user menjadi panitia dengan status aktif (draft atau published)
	var committeeEvents []models.CommitteeMember
	if err := database.DB.
		Preload("Event").
		Joins("JOIN events ON events.id = committee_members.event_id").
		Where("committee_members.user_id = ? AND events.status IN (?, ?)", userID, "draft", "published").
		Find(&committeeEvents).Error; err != nil {
		log.Printf("Error fetching committee events: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data panitia",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Jika ada event aktif, user bisa akses dashboard admin
	isCommittee := len(committeeEvents) > 0

	// Siapkan data event untuk response
	var activeEvents []map[string]interface{}
	for _, cm := range committeeEvents {
		if cm.Event.ID != 0 {
			activeEvents = append(activeEvents, map[string]interface{}{
				"event_id":   cm.Event.ID,
				"event_name": cm.Event.Title,
				"event_slug": cm.Event.Slug,
				"status":     cm.Event.Status,
				"position":   cm.Position,
				"division":   cm.Division,
			})
		}
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Status panitia user",
		Data: map[string]interface{}{
			"is_committee":         isCommittee,
			"active_events":        activeEvents,
			"active_event_count":   len(activeEvents),
			"show_admin_dashboard": isCommittee,
		},
	})
}
