package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

// Import CreateActivity function
// CreateActivity is defined in activity_controller.go

func FindEvents(c *gin.Context) {
	var events []models.Event

	// Tangkap query search (q)
	searchQuery := c.Query("q")
	// Tangkap query category
	categoryQuery := c.Query("category")
	// Tangkap query include_done (untuk kalender, include event yang sudah selesai)
	includeDone := c.Query("include_done")

	// Mulai query dasar dengan preload CreatedBy
	query := database.DB.Preload("CreatedBy")

	// Jika ada pencarian, filter berdasarkan title/location/description
	if searchQuery != "" {
		like := "%" + searchQuery + "%"
		query = query.Where("title LIKE ? OR location LIKE ? OR description LIKE ?", like, like, like)
	}

	// Jika ada filter kategori, tambahkan filter category
	if categoryQuery != "" {
		query = query.Where("category = ?", categoryQuery)
	}

	// Filter: Jangan tampilkan event dengan status "done" di daftar event normal
	// KECUALI jika parameter include_done="true" (untuk kalender)
	if includeDone != "true" {
		query = query.Where("status != ?", "done")
	}

	if err := query.Order("id desc").Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengambil data", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "List Events", "data": events})
}

func CreateEvent(c *gin.Context) {
	fmt.Println("--- MULAI PROSES CREATE EVENT ---") // Debug Log 1

	// 1. Tangkap Input
	title := c.PostForm("title")
	description := c.PostForm("description")
	location := c.PostForm("location")
	status := c.PostForm("status")
	category := c.PostForm("category")
	startStr := c.PostForm("start_date")
	endStr := c.PostForm("end_date")

	var quota int
	fmt.Sscanf(c.PostForm("quota"), "%d", &quota)

	// Parse harga event (optional, default 0 = gratis)
	var price int64 = 0
	priceStr := c.PostForm("price")
	if priceStr != "" {
		fmt.Sscanf(priceStr, "%d", &price)
	}

	// Parse event type (optional, default "offline")
	eventType := c.PostForm("event_type")
	if eventType == "" {
		eventType = "offline" // Default offline
	}

	// Parse speakers (JSON string)
	speakers := c.PostForm("speakers")

	fmt.Println("Data text diterima:", title) // Debug Log 2

	// 2. Handle Upload
	file, err := c.FormFile("banner")
	var bannerPath string

	if err == nil {
		// Pastikan folder public/images ada. Jika tidak, buat dulu.
		if _, err := os.Stat("public/images"); os.IsNotExist(err) {
			os.MkdirAll("public/images", 0755)
		}

		// Generate nama unik
		filename := uuid.New().String() + filepath.Ext(file.Filename)
		savePath := filepath.Join("public", "images", filename)

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			fmt.Println("Error Upload:", err.Error()) // Debug Log Error
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal simpan file gambar"})
			return
		}

		// URL untuk database
		bannerPath = "http://localhost:8000/public/images/" + filename
		fmt.Println("Gambar berhasil diupload ke:", savePath)
	}

	// 3. Parsing Tanggal
	layout := "2006-01-02"
	startDate, _ := time.Parse(layout, startStr)
	endDate, _ := time.Parse(layout, endStr)

	// Parse registration deadline (optional) - support datetime format
	var registrationDeadline *time.Time
	registrationDeadlineStr := c.PostForm("registration_deadline")
	if registrationDeadlineStr != "" {
		// Try datetime format first (YYYY-MM-DD HH:mm)
		datetimeLayout := "2006-01-02 15:04"
		parsedDeadline, err := time.Parse(datetimeLayout, registrationDeadlineStr)
		if err != nil {
			// Fallback to date-only format
			parsedDeadline, err = time.Parse(layout, registrationDeadlineStr)
			if err == nil {
				// Set to end of day (23:59:59) if only date provided
				parsedDeadline = time.Date(parsedDeadline.Year(), parsedDeadline.Month(), parsedDeadline.Day(), 23, 59, 59, 0, parsedDeadline.Location())
			}
		}
		if err == nil {
			registrationDeadline = &parsedDeadline
		}
	}

	// 4. Ambil User ID (SAFE MODE)
	var finalUserID uint = 1 // Default ke ID 1 jika gagal ambil token

	// Cek apakah middleware mengirim "id" atau "user_id"
	// Coba ambil 'id' dulu
	if val, exists := c.Get("id"); exists {
		switch v := val.(type) {
		case float64:
			finalUserID = uint(v)
		case uint:
			finalUserID = v
		case int:
			finalUserID = uint(v)
		}
	} else if val, exists := c.Get("user_id"); exists {
		// Coba ambil 'user_id' jika 'id' tidak ada
		switch v := val.(type) {
		case float64:
			finalUserID = uint(v)
		case uint:
			finalUserID = v
		case int:
			finalUserID = uint(v)
		}
	}

	fmt.Println("User ID yang digunakan:", finalUserID) // Debug Log 3

	// 5. Simpan Database
	slug := strings.ToLower(strings.ReplaceAll(title, " ", "-")) + "-" + uuid.New().String()[:8]

	event := models.Event{
		Title:                title,
		Slug:                 slug,
		Description:          description,
		Location:             location,
		Status:               status,
		Category:             category,
		Quota:                quota,
		Price:                price,
		EventType:            eventType, // "offline" atau "online"
		Speakers:             speakers,  // JSON string of speakers
		StartDate:            startDate,
		EndDate:              endDate,
		RegistrationDeadline: registrationDeadline,
		Banner:               bannerPath,
		CreatedByID:          finalUserID,
	}

	// Mulai transaksi untuk event dan committee members
	tx := database.DB.Begin()

	if err := tx.Create(&event).Error; err != nil {
		tx.Rollback()
		fmt.Println("Error Database:", err.Error()) // Debug Log Error
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal query database",
			"error":   err.Error(),
		})
		return
	}

	// 6. Handle Committee Members (jika ada)
	committeesJSON := c.PostForm("committees")
	if committeesJSON != "" {
		// Parse JSON array of committees
		var committees []struct {
			UserID   uint   `json:"user_id"`
			Position string `json:"position"`
		}
		if err := json.Unmarshal([]byte(committeesJSON), &committees); err == nil {
			for _, cm := range committees {
				// Cek apakah user sudah menjadi panitia di event ini (prevent duplicate)
				var existingMember models.CommitteeMember
				if err := tx.Where("event_id = ? AND user_id = ?", event.ID, cm.UserID).First(&existingMember).Error; err != nil {
					// User belum menjadi panitia, tambahkan
					committeeMember := models.CommitteeMember{
						EventID:  event.ID,
						UserID:   cm.UserID,
						Division: "-", // Tidak digunakan lagi
						Position: cm.Position,
					}
					if err := tx.Create(&committeeMember).Error; err != nil {
						fmt.Printf("Error creating committee member: %v\n", err)
						// Log error tapi tidak stop proses
					}
				}
			}
		}
	}

	// Commit transaksi
	if err := tx.Commit().Error; err != nil {
		fmt.Println("Error Commit:", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menyimpan data",
			"error":   err.Error(),
		})
		return
	}

	// Log activity untuk event created
	var user models.User
	if err := database.DB.First(&user, finalUserID).Error; err == nil {
		CreateActivity(finalUserID, "event_created", "event", event.ID,
			fmt.Sprintf("%s created event %s", user.Name, event.Title))
	}

	fmt.Println("--- SUKSES ---")
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Event berhasil dibuat!",
		"data":    event,
	})
}

func FindEventBySlug(c *gin.Context) {
	slug := c.Param("slug")
	var event models.Event

	// Cari berdasarkan slug, preload user pembuatnya
	if err := database.DB.Preload("CreatedBy").Where("slug = ?", slug).First(&event).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Event tidak ditemukan"})
		return
	}

	// Hitung jumlah peserta yang sudah terdaftar
	var registeredCount int64
	database.DB.Model(&models.Registration{}).Where("event_id = ?", event.ID).Count(&registeredCount)

	// Hitung kuota tersisa
	availableQuota := event.Quota - int(registeredCount)
	if event.Quota == 0 {
		availableQuota = -1 // -1 berarti unlimited
	}

	// Buat response dengan informasi tambahan
	responseData := gin.H{
		"id":               event.ID,
		"title":            event.Title,
		"slug":             event.Slug,
		"description":      event.Description,
		"banner":           event.Banner,
		"location":         event.Location,
		"start_date":       event.StartDate,
		"end_date":         event.EndDate,
		"status":           event.Status,
		"category":         event.Category,
		"quota":            event.Quota,
		"price":            event.Price,
		"event_type":       event.EventType,
		"registered_count": registeredCount,
		"available_quota":  availableQuota,
		"created_by":       event.CreatedBy,
		"created_at":       event.CreatedAt,
		"updated_at":       event.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Detail Event",
		"data":    responseData,
	})
}

// PUT /api/events/:id
func UpdateEvent(c *gin.Context) {
	id := c.Param("id")
	var event models.Event

	// 1. Cek apakah event ada
	if err := database.DB.First(&event, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Event tidak ditemukan"})
		return
	}

	// 2. Cek permission: hanya panitia atau pembuat event yang bisa edit
	userID, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	var currentUserID uint
	switch v := userID.(type) {
	case float64:
		currentUserID = uint(v)
	case uint:
		currentUserID = v
	case int:
		currentUserID = uint(v)
	}

	// Cek apakah user adalah pembuat event atau panitia event
	isCreator := event.CreatedByID == currentUserID
	var isCommittee bool
	var committeeMember models.CommitteeMember
	if err := database.DB.Where("event_id = ? AND user_id = ?", event.ID, currentUserID).First(&committeeMember).Error; err == nil {
		isCommittee = true
	}

	if !isCreator && !isCommittee {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Anda tidak memiliki akses untuk mengedit event ini. Hanya pembuat event atau panitia yang dapat mengedit."})
		return
	}

	// 3. Tangkap Input Form
	if title := c.PostForm("title"); title != "" {
		event.Title = title
	}
	if description := c.PostForm("description"); description != "" {
		event.Description = description
	}
	if location := c.PostForm("location"); location != "" {
		event.Location = location
	}
	if status := c.PostForm("status"); status != "" {
		event.Status = status
	}
	if category := c.PostForm("category"); category != "" {
		event.Category = category
	}

	// Parsing ulang tanggal & kuota & harga & event type
	quotaStr := c.PostForm("quota")
	if quotaStr != "" {
		fmt.Sscanf(quotaStr, "%d", &event.Quota)
	}

	priceStr := c.PostForm("price")
	if priceStr != "" {
		var price int64
		fmt.Sscanf(priceStr, "%d", &price)
		event.Price = price
	}

	eventTypeStr := c.PostForm("event_type")
	if eventTypeStr != "" {
		event.EventType = eventTypeStr
	}

	// Parse speakers (JSON string)
	if speakers := c.PostForm("speakers"); speakers != "" {
		event.Speakers = speakers
	}

	layout := "2006-01-02"
	if date := c.PostForm("start_date"); date != "" {
		event.StartDate, _ = time.Parse(layout, date)
	}
	if date := c.PostForm("end_date"); date != "" {
		event.EndDate, _ = time.Parse(layout, date)
	}

	// Parse registration deadline (optional) - support datetime format
	registrationDeadlineStr := c.PostForm("registration_deadline")
	if registrationDeadlineStr != "" {
		// Try datetime format first (YYYY-MM-DD HH:mm)
		datetimeLayout := "2006-01-02 15:04"
		parsedDeadline, err := time.Parse(datetimeLayout, registrationDeadlineStr)
		if err != nil {
			// Fallback to date-only format
			parsedDeadline, err = time.Parse(layout, registrationDeadlineStr)
			if err == nil {
				// Set to end of day (23:59:59) if only date provided
				parsedDeadline = time.Date(parsedDeadline.Year(), parsedDeadline.Month(), parsedDeadline.Day(), 23, 59, 59, 0, parsedDeadline.Location())
			}
		}
		if err == nil {
			event.RegistrationDeadline = &parsedDeadline
		}
	} else if c.PostForm("clear_registration_deadline") == "true" {
		// Jika ingin menghapus deadline, set ke nil
		event.RegistrationDeadline = nil
	}

	// 4. Handle Ganti Banner (Opsional)
	file, err := c.FormFile("banner")
	if err == nil {
		// Jika user upload gambar baru, hapus gambar lama dulu (opsional, good practice)
		// ... logic hapus file lama ...

		// Simpan gambar baru
		filename := uuid.New().String() + filepath.Ext(file.Filename)
		savePath := filepath.Join("public", "images", filename)
		c.SaveUploadedFile(file, savePath)
		event.Banner = "http://localhost:8000/public/images/" + filename
	}

	// 5. Simpan Perubahan
	database.DB.Save(&event)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Event berhasil diupdate", "data": event})
}

// DELETE /api/events/:id
func DeleteEvent(c *gin.Context) {
	id := c.Param("id")
	var event models.Event

	if err := database.DB.First(&event, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Event tidak ditemukan"})
		return
	}

	// Hapus dari database
	database.DB.Delete(&event)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Event berhasil dihapus"})
}

func ExportEventParticipants(c *gin.Context) {
	eventID := c.Param("id")

	// 1. Ambil Form Fields untuk Event ini (untuk header dinamis)
	var formFields []models.FormField
	if err := database.DB.Where("event_id = ?", eventID).Order("`order` ASC").Find(&formFields).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil form fields"})
		return
	}

	// 2. Ambil Data Peserta dari Database
	var registrations []models.Registration
	// Preload User dan Answers untuk mendapatkan jawaban form
	if err := database.DB.Preload("User").Preload("Answers.FormField").Where("event_id = ?", eventID).Find(&registrations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data"})
		return
	}

	// 3. Buat File Excel Baru
	f := excelize.NewFile()
	sheetName := "Peserta"
	index, _ := f.NewSheet(sheetName)
	f.SetActiveSheet(index)
	f.DeleteSheet("Sheet1") // Hapus sheet default kosong

	// 4. Buat Header (Judul Kolom) - Kolom dasar + kolom form fields
	headers := []string{"No", "Nama Peserta", "Email", "Status", "Kehadiran", "Kode QR", "Tanggal Daftar", "Waktu Check-in"}

	// Tambahkan kolom untuk setiap form field
	for _, field := range formFields {
		headers = append(headers, field.Label)
	}

	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Style Header (Bold + Kuning)
	lastHeaderCol, _ := excelize.CoordinatesToCellName(len(headers), 1)
	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#FFFF00"}, Pattern: 1},
	})
	f.SetCellStyle(sheetName, "A1", lastHeaderCol, style)

	// 5. Isi Data Baris per Baris
	for i, reg := range registrations {
		row := i + 2 // Mulai dari baris ke-2 (karena baris 1 itu header)

		// Kolom dasar
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), reg.User.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), reg.User.Email)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), reg.Status)

		// Kehadiran
		attendanceStatus := "Belum Hadir"
		if reg.Attendance {
			attendanceStatus = "Sudah Hadir"
		}
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), attendanceStatus)

		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), reg.QRCode)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), reg.CreatedAt.Format("2006-01-02 15:04"))

		checkInTime := "-"
		if reg.Attendance && !reg.UpdatedAt.IsZero() {
			checkInTime = reg.UpdatedAt.Format("2006-01-02 15:04")
		}
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), checkInTime)

		// Isi jawaban form fields
		// Buat map untuk lookup jawaban berdasarkan FormFieldID
		answerMap := make(map[uint]string)
		for _, answer := range reg.Answers {
			answerMap[answer.FormFieldID] = answer.Value
		}

		// Isi jawaban sesuai urutan form fields
		colIndex := 9 // Mulai dari kolom I (setelah kolom H)
		for _, field := range formFields {
			cell, _ := excelize.CoordinatesToCellName(colIndex, row)
			answer := answerMap[field.ID]
			if answer == "" {
				answer = "-" // Jika tidak ada jawaban
			}
			f.SetCellValue(sheetName, cell, answer)
			colIndex++
		}
	}

	// 6. Set Response Header agar browser mendownload file
	filename := fmt.Sprintf("Data_Peserta_Event_%s_%d.xlsx", eventID, time.Now().Unix())
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Transfer-Encoding", "binary")

	// 7. Kirim File ke Output
	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate file excel"})
		return
	}
}

// PUT /api/events/:id/complete - Update status event menjadi "done"
func CompleteEvent(c *gin.Context) {
	id := c.Param("id")
	var event models.Event

	// 1. Cek apakah event ada
	if err := database.DB.First(&event, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Event tidak ditemukan"})
		return
	}

	// 2. Update status menjadi "done"
	event.Status = "done"
	if err := database.DB.Save(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengupdate status event"})
		return
	}

	// Log activity
	userIDInterface, exists := c.Get("id")
	if exists {
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
		if err := database.DB.First(&user, userID).Error; err == nil {
			CreateActivity(userID, "event_completed", "event", event.ID,
				fmt.Sprintf("%s completed event %s", user.Name, event.Title))
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Status event berhasil diupdate menjadi selesai", "data": event})
}

// PUT /api/events/:id/publish - Publish event (ubah status menjadi "published")
func PublishEvent(c *gin.Context) {
	eventID := c.Param("id")
	var event models.Event

	// Cek apakah event ada
	if err := database.DB.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Event tidak ditemukan"})
		return
	}

	// Validasi: event tidak boleh sudah selesai
	if event.Status == "done" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Event yang sudah selesai tidak bisa dipublish"})
		return
	}

	// Update status menjadi "published"
	event.Status = "published"
	if err := database.DB.Save(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal publish event"})
		return
	}

	// Log activity untuk event published
	userIDInterface, exists := c.Get("id")
	if exists {
		var userID uint
		switch v := userIDInterface.(type) {
		case float64:
			userID = uint(v)
		case uint:
			userID = v
		case int:
			userID = uint(v)
		}
		if userID > 0 {
			var user models.User
			if err := database.DB.First(&user, userID).Error; err == nil {
				CreateActivity(userID, "event_published", "event", event.ID,
					fmt.Sprintf("%s published event %s", user.Name, event.Title))
			}
		}
	}

	// Kirim notifikasi ke semua panitia bahwa event sudah dipublish
	go helpers.NotifyEventPublished(event.ID, event.Title, event.Slug)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Event berhasil dipublish", "data": event})
}

// GET /api/events/completed - Ambil event dengan status "done" untuk laporan
func GetCompletedEvents(c *gin.Context) {
	var events []models.Event

	// Query untuk event dengan status "done"
	query := database.DB.Preload("CreatedBy").Where("status = ?", "done")

	// Filter pencarian (opsional)
	searchQuery := c.Query("q")
	if searchQuery != "" {
		like := "%" + searchQuery + "%"
		query = query.Where("title LIKE ? OR location LIKE ? OR description LIKE ?", like, like, like)
	}

	// Filter kategori (opsional)
	categoryQuery := c.Query("category")
	if categoryQuery != "" {
		query = query.Where("category = ?", categoryQuery)
	}

	if err := query.Order("end_date desc").Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengambil data event selesai", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "List Event Selesai", "data": events})
}

// GET /api/events/:id/report - Ambil laporan detail event yang sudah selesai
func GetEventReport(c *gin.Context) {
	eventID := c.Param("id")
	var event models.Event

	// Cek apakah event ada
	if err := database.DB.Preload("CreatedBy").First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Event tidak ditemukan"})
		return
	}

	// Hitung statistik peserta
	var totalParticipants int64
	var checkedInCount int64
	var pendingCount int64
	var confirmedCount int64

	database.DB.Model(&models.Registration{}).Where("event_id = ?", eventID).Count(&totalParticipants)
	database.DB.Model(&models.Registration{}).Where("event_id = ? AND status = ?", eventID, "checked_in").Count(&checkedInCount)
	database.DB.Model(&models.Registration{}).Where("event_id = ? AND status = ?", eventID, "pending").Count(&pendingCount)
	database.DB.Model(&models.Registration{}).Where("event_id = ? AND status = ?", eventID, "confirmed").Count(&confirmedCount)

	// Hitung total budget plan dan realisasi
	var totalBudgetPlan int64
	var totalBudgetReal int64
	database.DB.Model(&models.Budget{}).Where("event_id = ?", eventID).Select("COALESCE(SUM(planned_amount), 0)").Scan(&totalBudgetPlan)
	database.DB.Model(&models.Budget{}).Where("event_id = ?", eventID).Select("COALESCE(SUM(actual_amount), 0)").Scan(&totalBudgetReal)

	// Hitung total task
	var totalTasks int64
	var completedTasks int64
	database.DB.Model(&models.Task{}).Where("event_id = ?", eventID).Count(&totalTasks)
	database.DB.Model(&models.Task{}).Where("event_id = ? AND status = ?", eventID, "done").Count(&completedTasks)

	// Ambil daftar peserta
	var participants []models.Registration
	database.DB.Preload("User").Where("event_id = ?", eventID).Find(&participants)

	// Buat response
	report := gin.H{
		"event": event,
		"statistics": gin.H{
			"total_participants":   totalParticipants,
			"checked_in_count":     checkedInCount,
			"pending_count":        pendingCount,
			"confirmed_count":      confirmedCount,
			"attendance_rate":      0.0,
			"total_budget_plan":    totalBudgetPlan,
			"total_budget_real":    totalBudgetReal,
			"budget_difference":    totalBudgetReal - totalBudgetPlan,
			"total_tasks":          totalTasks,
			"completed_tasks":      completedTasks,
			"task_completion_rate": 0.0,
		},
		"participants": participants,
	}

	// Hitung attendance rate
	if totalParticipants > 0 {
		report["statistics"].(gin.H)["attendance_rate"] = float64(checkedInCount) / float64(totalParticipants) * 100
	}

	// Hitung task completion rate
	if totalTasks > 0 {
		report["statistics"].(gin.H)["task_completion_rate"] = float64(completedTasks) / float64(totalTasks) * 100
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Laporan Event", "data": report})
}

// GET /api/events/:id/performance - Ambil laporan performa panitia dan peserta untuk event
func GetEventPerformance(c *gin.Context) {
	eventID := c.Param("id")
	var event models.Event

	// Cek apakah event ada
	if err := database.DB.Preload("CreatedBy").First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Event tidak ditemukan"})
		return
	}

	// ============ PERFORMANSI PANITIA ============
	var committeeMembers []models.CommitteeMember
	database.DB.Preload("User").Where("event_id = ?", eventID).Find(&committeeMembers)

	type CommitteePerformance struct {
		UserID          uint    `json:"user_id"`
		UserName        string  `json:"user_name"`
		UserEmail       string  `json:"user_email"`
		Division        string  `json:"division"`
		Position        string  `json:"position"`
		TotalTasks      int64   `json:"total_tasks"`
		CompletedTasks  int64   `json:"completed_tasks"`
		InProgressTasks int64   `json:"in_progress_tasks"`
		TodoTasks       int64   `json:"todo_tasks"`
		ReviewTasks     int64   `json:"review_tasks"`
		OverdueTasks    int64   `json:"overdue_tasks"`
		CompletionRate  float64 `json:"completion_rate"`
		AverageDays     float64 `json:"average_completion_days"` // Rata-rata hari penyelesaian task
	}

	var committeePerformances []CommitteePerformance
	now := time.Now()

	for _, cm := range committeeMembers {
		var totalTasks, completedTasks, inProgressTasks, todoTasks, reviewTasks, overdueTasks int64

		// Hitung total tasks untuk panitia ini
		database.DB.Model(&models.Task{}).Where("event_id = ? AND assigned_to_id = ?", eventID, cm.UserID).Count(&totalTasks)
		database.DB.Model(&models.Task{}).Where("event_id = ? AND assigned_to_id = ? AND status = ?", eventID, cm.UserID, "done").Count(&completedTasks)
		database.DB.Model(&models.Task{}).Where("event_id = ? AND assigned_to_id = ? AND status = ?", eventID, cm.UserID, "in-progress").Count(&inProgressTasks)
		database.DB.Model(&models.Task{}).Where("event_id = ? AND assigned_to_id = ? AND status = ?", eventID, cm.UserID, "todo").Count(&todoTasks)
		database.DB.Model(&models.Task{}).Where("event_id = ? AND assigned_to_id = ? AND status = ?", eventID, cm.UserID, "review").Count(&reviewTasks)

		// Hitung overdue tasks (due_date < now dan status bukan done)
		var overdueTasksList []models.Task
		database.DB.Where("event_id = ? AND assigned_to_id = ? AND status != ? AND due_date IS NOT NULL AND due_date < ?",
			eventID, cm.UserID, "done", now).Find(&overdueTasksList)
		overdueTasks = int64(len(overdueTasksList))

		// Hitung completion rate
		completionRate := 0.0
		if totalTasks > 0 {
			completionRate = float64(completedTasks) / float64(totalTasks) * 100
		}

		// Hitung rata-rata hari penyelesaian task (hanya untuk task yang sudah completed)
		var completedTasksList []models.Task
		var totalDays float64
		completedTasksCount := 0
		if err := database.DB.Where("event_id = ? AND assigned_to_id = ? AND status = ?", eventID, cm.UserID, "done").
			Find(&completedTasksList).Error; err == nil {
			for _, task := range completedTasksList {
				if !task.CreatedAt.IsZero() && !task.UpdatedAt.IsZero() {
					duration := task.UpdatedAt.Sub(task.CreatedAt)
					totalDays += duration.Hours() / 24
					completedTasksCount++
				}
			}
		}
		averageDays := 0.0
		if completedTasksCount > 0 {
			averageDays = totalDays / float64(completedTasksCount)
		}

		committeePerformances = append(committeePerformances, CommitteePerformance{
			UserID:          cm.UserID,
			UserName:        cm.User.Name,
			UserEmail:       cm.User.Email,
			Division:        cm.Division,
			Position:        cm.Position,
			TotalTasks:      totalTasks,
			CompletedTasks:  completedTasks,
			InProgressTasks: inProgressTasks,
			TodoTasks:       todoTasks,
			ReviewTasks:     reviewTasks,
			OverdueTasks:    overdueTasks,
			CompletionRate:  completionRate,
			AverageDays:     averageDays,
		})
	}

	// ============ PERFORMANSI PESERTA ============
	var participants []models.Registration
	database.DB.Preload("User").Where("event_id = ?", eventID).Find(&participants)

	// Hitung statistik peserta
	var totalParticipants, checkedInCount, pendingCount, confirmedCount, rejectedCount int64
	var onTimeRegistrations, lateRegistrations int64
	var certificateSentCount int64

	// Gunakan start_date event sebagai batas "on-time" registration (misalnya 3 hari sebelum event)
	onTimeDeadline := event.StartDate.AddDate(0, 0, -3)
	if onTimeDeadline.After(now) {
		onTimeDeadline = now.AddDate(0, 0, -7) // Jika event belum dimulai, gunakan 7 hari lalu sebagai batas
	}

	for _, reg := range participants {
		totalParticipants++

		// Status breakdown
		if reg.Status == "checked_in" {
			checkedInCount++
		} else if reg.Status == "pending" {
			pendingCount++
		} else if reg.Status == "confirmed" {
			confirmedCount++
		} else if reg.Status == "rejected" {
			rejectedCount++
		}

		// On-time vs late registration
		if reg.CreatedAt.Before(onTimeDeadline) || reg.CreatedAt.Equal(onTimeDeadline) {
			onTimeRegistrations++
		} else {
			lateRegistrations++
		}

		// Certificate sent count
		var cert models.Certificate
		if err := database.DB.Where("registration_id = ? AND email_sent = ?", reg.ID, true).First(&cert).Error; err == nil {
			certificateSentCount++
		}
	}

	// Hitung attendance rate
	attendanceRate := 0.0
	if totalParticipants > 0 {
		attendanceRate = float64(checkedInCount) / float64(totalParticipants) * 100
	}

	// Status distribution untuk chart
	statusDistribution := gin.H{
		"checked_in": checkedInCount,
		"confirmed":  confirmedCount,
		"pending":    pendingCount,
		"rejected":   rejectedCount,
	}

	// Registration timing
	registrationTiming := gin.H{
		"on_time": onTimeRegistrations,
		"late":    lateRegistrations,
	}

	// Summary statistik peserta
	participantStats := gin.H{
		"total_participants":     totalParticipants,
		"checked_in_count":       checkedInCount,
		"pending_count":          pendingCount,
		"confirmed_count":        confirmedCount,
		"rejected_count":         rejectedCount,
		"attendance_rate":        attendanceRate,
		"certificate_sent_count": certificateSentCount,
		"status_distribution":    statusDistribution,
		"registration_timing":    registrationTiming,
	}

	// Response
	performanceReport := gin.H{
		"event":                   event,
		"committee_performance":   committeePerformances,
		"participant_performance": participantStats,
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Laporan Performa Event", "data": performanceReport})
}

// Background job untuk auto-update status event menjadi "done" berdasarkan end_date
func AutoCompleteEvents() {
	// Ambil semua event yang end_date sudah lewat dan status bukan "done"
	now := time.Now()
	var events []models.Event
	database.DB.Where("end_date < ? AND status != ?", now, "done").Find(&events)

	for _, event := range events {
		event.Status = "done"
		database.DB.Save(&event)
		fmt.Printf("Auto-completed event: %s (ID: %d)\n", event.Title, event.ID)
	}
}
