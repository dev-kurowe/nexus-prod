package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/services"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Struct Input dari Frontend
type RegistrationRequest struct {
	Answers []struct {
		FormFieldID uint   `json:"form_field_id"`
		Value       string `json:"value"`
	} `json:"answers"`
}

// POST /api/events/:id/register
func RegisterEvent(c *gin.Context) {
	eventID := c.Param("id")

	// 1. Ambil User ID dari Token (Pastikan user login)
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

	// 2. Cek Event Exist & Status
	var event models.Event
	if err := database.DB.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Event tidak ditemukan"})
		return
	}

	// Validasi: Event harus published
	if event.Status != "published" {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Event belum dibuka untuk pendaftaran. Status: " + event.Status,
		})
		return
	}

	// Validasi: Cek tenggat waktu pendaftaran (jika ada)
	if event.RegistrationDeadline != nil {
		now := time.Now()
		// Gunakan waktu deadline langsung (sudah termasuk jam dan menit)
		if now.After(*event.RegistrationDeadline) {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Pendaftaran sudah ditutup. Batas waktu pendaftaran: " + event.RegistrationDeadline.Format("02 January 2006 pukul 15:04"),
			})
			return
		}
	}

	// 3. Cek apakah User sudah pernah daftar di event ini? (Cegah double register)
	var existingReg int64
	database.DB.Model(&models.Registration{}).Where("event_id = ? AND user_id = ?", eventID, userID).Count(&existingReg)
	if existingReg > 0 {
		c.JSON(http.StatusConflict, gin.H{"message": "Anda sudah terdaftar di event ini!"})
		return
	}

	// 4. Validasi Kuota
	var registeredCount int64
	database.DB.Model(&models.Registration{}).Where("event_id = ?", eventID).Count(&registeredCount)
	if event.Quota > 0 && int(registeredCount) >= event.Quota {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Kuota event sudah penuh. Tidak dapat mendaftar lagi.",
		})
		return
	}

	// 5. Parse Input Jawaban
	var input RegistrationRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data jawaban tidak valid", "error": err.Error()})
		return
	}

	// 6. Validasi Field Required
	var formFields []models.FormField
	if err := database.DB.Where("event_id = ? AND is_required = ?", eventID, true).Find(&formFields).Error; err == nil {
		for _, field := range formFields {
			// Cek apakah field required ada di jawaban
			found := false
			for _, ans := range input.Answers {
				if ans.FormFieldID == field.ID && ans.Value != "" {
					found = true
					break
				}
			}
			if !found {
				c.JSON(http.StatusBadRequest, gin.H{
					"message": fmt.Sprintf("Field '%s' wajib diisi", field.Label),
				})
				return
			}
		}
	}

	// 7. Mulai Transaksi Database
	tx := database.DB.Begin()

	// A. Simpan Header Pendaftaran
	// Generate QR Code unik: EVT-{EventID}-USER-{UserID}-{Random}
	qrCode := fmt.Sprintf("EVT-%s-USR-%d-%s", eventID, userID, uuid.New().String()[:6])

	registration := models.Registration{
		EventID:    stringToUint(eventID),
		UserID:     userID,
		Status:     "pending",
		QRCode:     qrCode,
		Attendance: false,
	}

	if err := tx.Create(&registration).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan pendaftaran"})
		return
	}

	// B. Simpan Jawaban Form
	for _, ans := range input.Answers {
		answer := models.FormAnswer{
			RegistrationID: registration.ID,
			FormFieldID:    ans.FormFieldID,
			Value:          ans.Value,
		}
		if err := tx.Create(&answer).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan jawaban form"})
			return
		}
	}

	// 8. Commit (Simpan Permanen)
	tx.Commit()

	// 9. Ambil data user untuk notifikasi
	var user models.User
	database.DB.First(&user, userID)

	// 10. Kirim notifikasi ke peserta dan panitia
	go helpers.NotifyRegistrationSubmitted(userID, event.Title, event.Slug)
	go helpers.NotifyNewRegistration(event.ID, event.Title, user.Name)

	// 11. Catat aktivitas pendaftaran
	CreateActivity(userID, "registered", "event", event.ID,
		fmt.Sprintf("mendaftar event %s", event.Title))

	// 12. Handle Event Gratis vs Berbayar
	if event.Price == 0 {
		// Event GRATIS: Status tetap "pending", perlu approval panitia
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": "Pendaftaran berhasil! Silakan tunggu konfirmasi dari panitia.",
			"data":    registration,
			"is_free": true,
		})
	} else {
		// Event BERBAYAR: Initiate payment Midtrans
		// user sudah diambil di atas, tidak perlu fetch lagi

		// Generate snap token untuk pembayaran
		token, redirectURL, orderID, err := services.GetSnapToken(registration, user, event)
		if err != nil {
			// Jika gagal generate payment, tetap simpan registration sebagai pending
			c.JSON(http.StatusCreated, gin.H{
				"success":       true,
				"message":       "Pendaftaran berhasil, namun gagal membuat link pembayaran. Silakan hubungi panitia.",
				"data":          registration,
				"is_free":       false,
				"payment_error": err.Error(),
			})
			return
		}

		// Simpan payment token dan order ID ke database
		registration.PaymentToken = token
		registration.PaymentURL = redirectURL
		registration.OrderID = orderID
		if err := database.DB.Save(&registration).Error; err != nil {
			c.JSON(http.StatusCreated, gin.H{
				"success": true,
				"message": "Pendaftaran berhasil, namun gagal menyimpan data pembayaran. Silakan hubungi panitia.",
				"data":    registration,
				"is_free": false,
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": "Pendaftaran berhasil! Silakan selesaikan pembayaran.",
			"data":    registration,
			"is_free": false,
			"payment": gin.H{
				"token":        token,
				"redirect_url": redirectURL,
				"order_id":     orderID,
			},
		})
	}
}

// GET /api/events/:id/participants
func GetParticipants(c *gin.Context) {
	eventID := c.Param("id")
	var participants []models.Registration

	err := database.DB.
		Preload("User").              // Ambil nama user
		Preload("Answers.FormField"). // Ambil jawaban detail
		Where("event_id = ?", eventID).
		Find(&participants).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data peserta"})
		return
	}

	// Buat response dengan data certificate
	type ParticipantResponse struct {
		models.Registration
		EmailSent bool `json:"email_sent"`
	}

	var response []ParticipantResponse
	for _, p := range participants {
		var cert models.Certificate
		emailSent := false
		if err := database.DB.Where("registration_id = ?", p.ID).First(&cert).Error; err == nil {
			p.CertificateURL = cert.CertificateURL
			emailSent = cert.EmailSent
		}

		response = append(response, ParticipantResponse{
			Registration: p,
			EmailSent:    emailSent,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": response})
}

func GetUserRegistrations(c *gin.Context) {
	// 1. Ambil User ID dari Token (Pastikan user login)
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

	var registrations []models.Registration

	// Hanya ambil registrations dari event yang statusnya bukan "done" (event masih aktif)
	if err := database.DB.
		Preload("Event").Preload("User").
		Joins("INNER JOIN events ON registrations.event_id = events.id").
		Where("registrations.user_id = ? AND events.status != ?", userID, "done").
		Find(&registrations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data tiket"})
		return
	}

	// Tambahkan data certificate (email_sent) untuk setiap registration
	type RegistrationResponse struct {
		models.Registration
		EmailSent bool `json:"email_sent"`
	}

	var response []RegistrationResponse
	for _, reg := range registrations {
		var cert models.Certificate
		emailSent := false
		if err := database.DB.Where("registration_id = ?", reg.ID).First(&cert).Error; err == nil {
			reg.CertificateURL = cert.CertificateURL
			emailSent = cert.EmailSent
		}

		response = append(response, RegistrationResponse{
			Registration: reg,
			EmailSent:    emailSent,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GET /api/events/:id/registration-status
// Cek apakah user sudah terdaftar di event ini
func GetRegistrationStatus(c *gin.Context) {
	eventID := c.Param("id")

	// Ambil User ID dari Token
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

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

	// Cek apakah user sudah terdaftar
	var registration models.Registration
	result := database.DB.Where("event_id = ? AND user_id = ?", eventID, userID).Find(&registration)

	if result.Error != nil {
		// Error database (bukan "record not found")
		fmt.Printf("Error checking registration: %v\n", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengecek status pendaftaran",
		})
		return
	}

	// Cek apakah record ditemukan
	if result.RowsAffected == 0 {
		// User belum terdaftar - ini normal, bukan error
		c.JSON(http.StatusOK, gin.H{
			"success":    true,
			"registered": false,
			"message":    "Anda belum terdaftar di event ini",
		})
		return
	}

	// User sudah terdaftar
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"registered": true,
		"data":       registration,
		"message":    "Anda sudah terdaftar di event ini",
	})
}

type ScanRequest struct {
	QRCode string `json:"qr_code" binding:"required"`
}

type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=confirmed rejected"`
}

type BulkUpdateStatusRequest struct {
	RegistrationIDs []uint `json:"registration_ids" binding:"required"`
	Status          string `json:"status" binding:"required,oneof=confirmed rejected"`
}

// VerifyCheckIn untuk scan QR Code (Event Offline dan Hybrid)
func VerifyCheckIn(c *gin.Context) {
	var req ScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "QR Code tidak terbaca"})
		return
	}

	var registration models.Registration
	if err := database.DB.Preload("Event").Preload("User").Where("qr_code = ?", req.QRCode).First(&registration).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "QR Code tidak valid / Data tidak ditemukan"})
		return
	}

	// Cek event type: scan QR hanya untuk event offline dan hybrid
	if registration.Event.EventType == "online" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Event ini adalah event online. Untuk check-in, silakan gunakan link konfirmasi kehadiran di halaman tiket Anda.",
		})
		return
	}

	if registration.Status == "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Peserta belum melunasi pembayaran (Status: Pending)"})
		return
	}

	if registration.Status == "checked_in" {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Peserta SUDAH Check-in sebelumnya!",
			"data": gin.H{
				"user_name":     registration.User.Name,
				"check_in_time": registration.UpdatedAt,
			},
		})
		return
	}

	// Update attendance
	registration.Status = "checked_in"
	registration.Attendance = true
	registration.AttendanceType = "offline" // Hadir secara offline (scan QR)
	if err := database.DB.Save(&registration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menyimpan check-in",
		})
		return
	}

	// Log activity
	if userIDInterface, exists := c.Get("id"); exists {
		var panitiaUserID uint
		switch v := userIDInterface.(type) {
		case float64:
			panitiaUserID = uint(v)
		case uint:
			panitiaUserID = v
		case int:
			panitiaUserID = uint(v)
		}
		// CreateActivity ada di package controllers yang sama (activity_controller.go)
		CreateActivity(panitiaUserID, "check_in", "registration", registration.ID,
			fmt.Sprintf("Panitia melakukan check-in untuk %s di event %s", registration.User.Name, registration.Event.Title))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Check-in Berhasil!",
		"data": gin.H{
			"user_name": registration.User.Name,
			"event":     registration.Event.Title,
			"status":    "Hadir",
		},
	})
}

// POST /api/check-in/self (Self Check-in untuk event online via token/QRCode dengan upload bukti kehadiran)
func SelfCheckIn(c *gin.Context) {
	// Parse multipart form untuk token dan file bukti kehadiran
	token := c.PostForm("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Token tidak valid"})
		return
	}

	// Ambil User ID dari Token (Pastikan user login)
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

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

	// Cari registration berdasarkan token/QRCode
	var registration models.Registration
	if err := database.DB.Preload("Event").Preload("User").Where("qr_code = ?", token).First(&registration).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Token tidak valid atau data tidak ditemukan"})
		return
	}

	// Validasi: Token harus milik user yang login
	if registration.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Token tidak valid untuk akun Anda"})
		return
	}

	// Cek event type: hanya untuk event online dan hybrid yang bisa self-check-in
	if registration.Event.EventType == "offline" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Event ini adalah event offline. Silakan gunakan scan QR code untuk check-in.",
		})
		return
	}

	// Validasi: Status harus confirmed (sudah bayar/approve)
	if registration.Status == "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Peserta belum melunasi pembayaran (Status: Pending)"})
		return
	}

	if registration.Status == "checked_in" {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Anda sudah melakukan check-in sebelumnya!",
			"data": gin.H{
				"check_in_time": registration.UpdatedAt,
			},
		})
		return
	}

	// Handle upload bukti kehadiran (screenshot zoom, dll)
	var proofURL string
	file, err := c.FormFile("proof")
	if err == nil {
		// Pastikan folder public/attendance_proofs ada
		if _, err := os.Stat("public/attendance_proofs"); os.IsNotExist(err) {
			os.MkdirAll("public/attendance_proofs", 0755)
		}

		// Generate nama unik untuk file
		filename := fmt.Sprintf("proof-%d-%s%s", registration.ID, uuid.New().String()[:8], filepath.Ext(file.Filename))
		savePath := filepath.Join("public", "attendance_proofs", filename)

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Gagal menyimpan bukti kehadiran",
			})
			return
		}

		// URL untuk database
		proofURL = fmt.Sprintf("http://localhost:8000/public/attendance_proofs/%s", filename)
	}

	// Update attendance dan bukti kehadiran
	registration.Status = "checked_in"
	registration.Attendance = true
	registration.AttendanceType = "online" // Hadir secara online (self check-in)
	if proofURL != "" {
		registration.AttendanceProofURL = proofURL
	}
	if err := database.DB.Save(&registration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menyimpan check-in",
		})
		return
	}

	// Log activity
	activityMsg := fmt.Sprintf("%s checked in to online event %s", registration.User.Name, registration.Event.Title)
	if proofURL != "" {
		activityMsg += " (dengan bukti kehadiran)"
	}
	CreateActivity(userID, "check_in", "registration", registration.ID, activityMsg)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Check-in Berhasil! Terima kasih sudah hadir di event ini.",
		"data": gin.H{
			"event":         registration.Event.Title,
			"status":        "Hadir",
			"check_in_time": time.Now(),
			"proof_url":     proofURL,
		},
	})
}

// PUT /api/participants/:id/attendance (Manual Update Attendance oleh Panitia)
func UpdateAttendance(c *gin.Context) {
	registrationID := c.Param("id")

	// Ambil User ID dari Token (Pastikan user login - panitia)
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

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

	// Parse request body
	var req struct {
		Attendance bool `json:"attendance"` // true = hadir, false = tidak hadir
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Data tidak valid",
		})
		return
	}

	// Cari registration
	var registration models.Registration
	if err := database.DB.Preload("Event").Preload("User").First(&registration, registrationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Pendaftaran tidak ditemukan",
		})
		return
	}

	// Cek apakah user adalah panitia dari event ini ATAU Super Admin
	var committeeMember models.CommitteeMember
	isCommittee := database.DB.Where("event_id = ? AND user_id = ?", registration.EventID, userID).First(&committeeMember).Error == nil

	// Cek apakah user adalah Super Admin
	var currentUser models.User
	isSuperAdmin := false
	if err := database.DB.Preload("Role").First(&currentUser, userID).Error; err == nil {
		roleCodeLower := strings.ToLower(currentUser.Role.Code)
		roleNameUpper := strings.ToUpper(currentUser.Role.Name)
		isSuperAdmin = roleCodeLower == "superadmin" ||
			strings.Contains(roleNameUpper, "SUPER ADMIN") ||
			strings.Contains(roleNameUpper, "SUPERADMIN")

		// Debug logging
		fmt.Printf("UpdateAttendance: User ID=%d, Role.Code=%s, Role.Name=%s, isSuperAdmin=%v, isCommittee=%v\n",
			userID, currentUser.Role.Code, currentUser.Role.Name, isSuperAdmin, isCommittee)
	} else {
		fmt.Printf("UpdateAttendance: Error fetching user ID=%d: %v\n", userID, err)
	}

	if !isCommittee && !isSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": fmt.Sprintf("Anda bukan panitia dari event ini. (User ID: %d, isCommittee: %v, isSuperAdmin: %v)", userID, isCommittee, isSuperAdmin),
		})
		return
	}

	// Update attendance
	oldAttendance := registration.Attendance
	oldStatus := registration.Status

	registration.Attendance = req.Attendance
	if req.Attendance {
		// Jika attendance = true, ubah status menjadi checked_in
		registration.Status = "checked_in"
		fmt.Printf("UpdateAttendance: Registration ID=%d: attendance %v -> %v, status %s -> checked_in\n",
			registration.ID, oldAttendance, req.Attendance, oldStatus)
	} else {
		// Jika attendance = false, ubah status kembali ke confirmed (jika sebelumnya checked_in)
		if registration.Status == "checked_in" {
			registration.Status = "confirmed"
			fmt.Printf("UpdateAttendance: Registration ID=%d: attendance %v -> %v, status checked_in -> confirmed\n",
				registration.ID, oldAttendance, req.Attendance)
		} else {
			fmt.Printf("UpdateAttendance: Registration ID=%d: attendance %v -> %v, status remains %s\n",
				registration.ID, oldAttendance, req.Attendance, registration.Status)
		}
		// Jika status bukan checked_in, tetap sesuai statusnya (confirmed/rejected)
	}

	if err := database.DB.Save(&registration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengupdate kehadiran",
		})
		return
	}

	// Reload registration dari database untuk memastikan data terbaru (termasuk Attendance dan Status)
	if err := database.DB.Preload("User").Preload("Event").First(&registration, registration.ID).Error; err != nil {
		fmt.Printf("UpdateAttendance: Error reloading registration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Kehadiran berhasil diupdate, namun gagal mengambil data terbaru",
		})
		return
	}

	fmt.Printf("UpdateAttendance: Final registration data - ID=%d, Attendance=%v, Status=%s\n",
		registration.ID, registration.Attendance, registration.Status)

	// Log activity
	actorType := "Panitia"
	if isSuperAdmin {
		actorType = "Super Admin"
	}
	if req.Attendance {
		CreateActivity(userID, "attendance_updated", "registration", registration.ID,
			fmt.Sprintf("%s mengupdate kehadiran %s menjadi Hadir untuk event %s", actorType, registration.User.Name, registration.Event.Title))
	} else {
		CreateActivity(userID, "attendance_updated", "registration", registration.ID,
			fmt.Sprintf("%s mengupdate kehadiran %s menjadi Tidak Hadir untuk event %s", actorType, registration.User.Name, registration.Event.Title))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Kehadiran berhasil diupdate menjadi %s", func() string {
			if req.Attendance {
				return "Hadir"
			}
			return "Tidak Hadir"
		}()),
		"data": registration,
	})
}

// PUT /api/participants/:id/status
func UpdateRegistrationStatus(c *gin.Context) {
	registrationID := c.Param("id")

	// Parse request body
	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Status tidak valid. Harus 'confirmed' atau 'rejected'",
			"error":   err.Error(),
		})
		return
	}

	// Cari registration by ID dengan preload user & event
	var registration models.Registration
	if err := database.DB.Preload("User").Preload("Event").First(&registration, registrationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Pendaftaran tidak ditemukan",
		})
		return
	}

	// Update status
	registration.Status = req.Status
	if err := database.DB.Save(&registration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengupdate status pendaftaran",
			"error":   err.Error(),
		})
		return
	}

	// Kirim email jika status confirmed
	if req.Status == "confirmed" && registration.User.Email != "" {
		eventDate := ""
		if !registration.Event.StartDate.IsZero() {
			eventDate = registration.Event.StartDate.Format("02 Jan 2006")
		}
		go helpers.SendSuccessEmail(
			registration.User.Email,
			registration.User.Name,
			registration.Event.Title,
			eventDate,
			registration.Event.Location,
		)
		// Kirim notifikasi approved
		go helpers.NotifyRegistrationApproved(registration.UserID, registration.Event.Title, registration.Event.Slug)
	}

	// Kirim notifikasi rejected
	if req.Status == "rejected" {
		go helpers.NotifyRegistrationRejected(registration.UserID, registration.Event.Title, "")
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Status pendaftaran berhasil diupdate menjadi '%s'", req.Status),
		"data":    registration,
	})
}

// POST /api/participants/bulk-update-status
func BulkUpdateRegistrationStatus(c *gin.Context) {
	// Parse request body
	var req BulkUpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Data tidak valid",
			"error":   err.Error(),
		})
		return
	}

	// Validasi: Pastikan ada minimal 1 ID
	if len(req.RegistrationIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Minimal harus memilih 1 pendaftaran",
		})
		return
	}

	// Update status untuk semua registration yang dipilih
	result := database.DB.Model(&models.Registration{}).
		Where("id IN ?", req.RegistrationIDs).
		Update("status", req.Status)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengupdate status pendaftaran",
			"error":   result.Error.Error(),
		})
		return
	}

	// Cek berapa banyak yang berhasil diupdate
	updatedCount := result.RowsAffected

	// Jika status confirmed, kirim email ke masing-masing peserta
	if req.Status == "confirmed" && updatedCount > 0 {
		var regs []models.Registration
		if err := database.DB.Preload("User").Preload("Event").Where("id IN ?", req.RegistrationIDs).Find(&regs).Error; err == nil {
			for _, r := range regs {
				if r.User.Email == "" {
					continue
				}
				eventDate := ""
				if !r.Event.StartDate.IsZero() {
					eventDate = r.Event.StartDate.Format("02 Jan 2006")
				}
				go helpers.SendSuccessEmail(
					r.User.Email,
					r.User.Name,
					r.Event.Title,
					eventDate,
					r.Event.Location,
				)
				// Kirim notifikasi approved
				go helpers.NotifyRegistrationApproved(r.UserID, r.Event.Title, r.Event.Slug)
			}
		}
	}

	// Jika status rejected, kirim notifikasi ke masing-masing peserta
	if req.Status == "rejected" && updatedCount > 0 {
		var regs []models.Registration
		if err := database.DB.Preload("User").Preload("Event").Where("id IN ?", req.RegistrationIDs).Find(&regs).Error; err == nil {
			for _, r := range regs {
				go helpers.NotifyRegistrationRejected(r.UserID, r.Event.Title, "")
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"message":       fmt.Sprintf("Berhasil mengupdate status %d pendaftaran menjadi '%s'", updatedCount, req.Status),
		"updated_count": updatedCount,
	})
}
