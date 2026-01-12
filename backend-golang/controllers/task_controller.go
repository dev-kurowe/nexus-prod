package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Helper function untuk mendapatkan nama user
func getUserName(userID uint) string {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return "Unknown"
	}
	return user.Name
}

type CreateTaskRequest struct {
	Title        string     `json:"title" binding:"required"`
	Description  string     `json:"description"`
	Priority     string     `json:"priority" binding:"required"` // low, medium, high
	AssignedToID *uint      `json:"assigned_to_id"`              // Nullable
	DueDate      *time.Time `json:"due_date"`                    // Nullable
}

type UpdateTaskRequest struct {
	Title        *string    `json:"title"`
	Description  *string    `json:"description"`
	Status       *string    `json:"status"`         // todo, in-progress, review, done
	Priority     *string    `json:"priority"`       // low, medium, high
	AssignedToID *uint      `json:"assigned_to_id"` // Nullable
	DueDate      *time.Time `json:"due_date"`       // Nullable
}

// GetTasks mengambil semua task berdasarkan event_id
func GetTasks(c *gin.Context) {
	eventID := c.Param("event_id")

	var tasks []models.Task

	// Ambil data dengan preload AssignedTo dan CreatedBy untuk dapat detail user
	if err := database.DB.Preload("AssignedTo").Preload("CreatedBy").Where("event_id = ?", eventID).Order("created_at DESC").Find(&tasks).Error; err != nil {
		log.Printf("Error fetching tasks: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data tugas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Daftar tugas event",
		Data:    tasks,
	})
}

// GetUserTasks mengambil semua task yang ditugaskan ke user yang sedang login
func GetUserTasks(c *gin.Context) {
	// Ambil user ID dari context
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
			Errors:  map[string]string{"error": "User ID not found in token"},
		})
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
	}

	var tasks []models.Task
	now := time.Now()

	// Ambil task yang assigned ke user ini HANYA dari event aktif yang user ikuti sebagai panitia
	// Menggunakan kondisi yang sama dengan dashboard: status != "done" dan (published atau dalam range tanggal)
	if err := database.DB.
		Preload("Event").Preload("AssignedTo").
		Joins("INNER JOIN events ON tasks.event_id = events.id").
		Joins("INNER JOIN committee_members ON events.id = committee_members.event_id").
		Where("tasks.assigned_to_id = ? AND committee_members.user_id = ? AND events.status != ? AND (events.status = ? OR (events.start_date <= ? AND events.end_date >= ?))",
			userID, userID, "done", "published", now, now).
		Order("tasks.created_at DESC").Find(&tasks).Error; err != nil {
		log.Printf("Error fetching user tasks: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data tugas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Daftar tugas saya",
		Data:    tasks,
	})
}

// CreateTask membuat task baru
func CreateTask(c *gin.Context) {
	eventID := c.Param("event_id")
	var req CreateTaskRequest

	// Validasi request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validasi Errors",
			Errors:  map[string]string{"error": "Title dan Priority wajib diisi"},
		})
		return
	}

	// Validasi priority
	if req.Priority != "low" && req.Priority != "medium" && req.Priority != "high" {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Priority harus low, medium, atau high",
			Errors:  map[string]string{"priority": "Invalid priority value"},
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

	// Jika assigned_to_id diberikan, cek apakah user ada
	if req.AssignedToID != nil {
		var user models.User
		if err := database.DB.First(&user, *req.AssignedToID).Error; err != nil {
			c.JSON(http.StatusNotFound, structs.ErrorResponse{
				Success: false,
				Message: "User yang ditugaskan tidak ditemukan",
				Errors:  map[string]string{"assigned_to_id": "User not found"},
			})
			return
		}
	}

	// Ambil user ID dari context (yang membuat tugas)
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
			Errors:  map[string]string{"error": "User ID not found in token"},
		})
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
	}

	// Buat task baru dengan status default "todo"
	task := models.Task{
		EventID:      event.ID,
		CreatedByID:  userID, // User yang membuat tugas (yang memberi tugas)
		Title:        req.Title,
		Description:  req.Description,
		Status:       "todo", // Default status
		Priority:     req.Priority,
		AssignedToID: req.AssignedToID,
		DueDate:      req.DueDate,
	}

	// Simpan ke database
	if err := database.DB.Create(&task).Error; err != nil {
		log.Printf("Error creating task: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal membuat tugas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Preload AssignedTo dan CreatedBy untuk response
	database.DB.Preload("AssignedTo").Preload("CreatedBy").First(&task, task.ID)

	// Kirim notifikasi ke user yang diberi tugas (jika ada)
	if req.AssignedToID != nil && *req.AssignedToID != 0 {
		go helpers.NotifyTaskAssigned(*req.AssignedToID, task.Title, event.Title, event.Slug)
	}

	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Tugas berhasil dibuat",
		Data:    task,
	})
}

// UpdateTask mengupdate task (hanya Super Admin dan Ketua Himpunan)
func UpdateTask(c *gin.Context) {
	taskID := c.Param("task_id")
	var req UpdateTaskRequest

	// Validasi request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validasi Errors",
			Errors:  map[string]string{"error": "Invalid request"},
		})
		return
	}

	// Ambil user ID dari context
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
			Errors:  map[string]string{"error": "User ID not found in token"},
		})
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
	}

	// Cek apakah task ada
	var task models.Task
	if err := database.DB.First(&task, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Tugas tidak ditemukan",
			Errors:  map[string]string{"error": "Task not found"},
		})
		return
	}

	// Check permission untuk mengubah status:
	// - Yang bisa ubah status: CreatedByID (yang memberi tugas) atau panitia event
	// - Yang tidak bisa ubah status: AssignedToID (yang diberi tugas) - hanya bisa upload proof

	// Cek apakah user adalah yang membuat tugas (CreatedByID)
	isCreator := task.CreatedByID == userID

	// Cek apakah user adalah panitia dari event ini
	var committeeMember models.CommitteeMember
	isCommittee := database.DB.Where("event_id = ? AND user_id = ?", task.EventID, userID).First(&committeeMember).Error == nil

	// Cek apakah user adalah Super Admin
	var user models.User
	isSuperAdmin := false
	if err := database.DB.Preload("Role").First(&user, userID).Error; err == nil {
		isSuperAdmin = user.Role.Code == "superadmin" || user.Role.Code == "kahim"
	}

	// Cek apakah user adalah yang diberi tugas (AssignedToID)
	isAssignee := task.AssignedToID != nil && *task.AssignedToID == userID

	// Jika request mengubah status, cek permission khusus
	if req.Status != nil {
		// Yang diberi tugas (assignee) TIDAK BISA mengubah status
		if isAssignee && !isCreator && !isCommittee && !isSuperAdmin {
			c.JSON(http.StatusForbidden, structs.ErrorResponse{
				Success: false,
				Message: "Anda tidak memiliki izin untuk mengubah status tugas ini. Hanya yang memberi tugas atau panitia yang dapat mengubah status. Anda hanya bisa mengerjakan dan mengirim bukti pengerjaan.",
				Errors:  map[string]string{"error": "Assignee cannot change task status"},
			})
			return
		}

		// Yang bisa ubah status: creator, panitia, atau super admin
		if !isCreator && !isCommittee && !isSuperAdmin {
			c.JSON(http.StatusForbidden, structs.ErrorResponse{
				Success: false,
				Message: "Anda tidak memiliki izin untuk mengubah status tugas ini. Hanya yang memberi tugas atau panitia yang dapat mengubah status.",
				Errors:  map[string]string{"error": "Only creator, committee, or admin can change task status"},
			})
			return
		}
	}

	// Untuk field lain (title, description, priority, assigned_to_id, due_date):
	// Hanya creator, panitia, atau super admin yang bisa edit
	if req.Title != nil || req.Description != nil || req.Priority != nil || req.AssignedToID != nil || req.DueDate != nil {
		if !isCreator && !isCommittee && !isSuperAdmin {
			c.JSON(http.StatusForbidden, structs.ErrorResponse{
				Success: false,
				Message: "Anda tidak memiliki izin untuk mengedit tugas ini. Hanya yang memberi tugas atau panitia yang dapat mengedit.",
				Errors:  map[string]string{"error": "Only creator, committee, or admin can edit tasks"},
			})
			return
		}
	}

	// Update fields yang diberikan
	if req.Title != nil {
		task.Title = *req.Title
	}
	if req.Description != nil {
		task.Description = *req.Description
	}
	if req.Status != nil {
		// Validasi status
		validStatuses := map[string]bool{"todo": true, "in-progress": true, "review": true, "done": true}
		if !validStatuses[*req.Status] {
			c.JSON(http.StatusBadRequest, structs.ErrorResponse{
				Success: false,
				Message: "Status harus todo, in-progress, review, atau done",
				Errors:  map[string]string{"status": "Invalid status value"},
			})
			return
		}
		oldStatus := task.Status
		task.Status = *req.Status

		// Log activity jika status berubah ke "done"
		if *req.Status == "done" && oldStatus != "done" {
			var assignedUser models.User
			if task.AssignedToID != nil {
				database.DB.First(&assignedUser, *task.AssignedToID)
				CreateActivity(userID, "task_completed", "task", task.ID,
					fmt.Sprintf("%s completed task %s", assignedUser.Name, task.Title))
			}

			// Kirim notifikasi ke creator bahwa task selesai
			var event models.Event
			database.DB.First(&event, task.EventID)
			if task.AssignedToID != nil {
				go helpers.NotifyTaskCompleted(task.CreatedByID, task.Title, event.Title, event.Slug, getUserName(*task.AssignedToID))
			}
		}
	}
	if req.Priority != nil {
		// Validasi priority
		if *req.Priority != "low" && *req.Priority != "medium" && *req.Priority != "high" {
			c.JSON(http.StatusBadRequest, structs.ErrorResponse{
				Success: false,
				Message: "Priority harus low, medium, atau high",
				Errors:  map[string]string{"priority": "Invalid priority value"},
			})
			return
		}
		task.Priority = *req.Priority
	}
	if req.AssignedToID != nil {
		// Jika assigned_to_id diberikan, cek apakah user ada
		if *req.AssignedToID != 0 {
			var user models.User
			if err := database.DB.First(&user, *req.AssignedToID).Error; err != nil {
				c.JSON(http.StatusNotFound, structs.ErrorResponse{
					Success: false,
					Message: "User yang ditugaskan tidak ditemukan",
					Errors:  map[string]string{"assigned_to_id": "User not found"},
				})
				return
			}
			// Log activity jika task di-assign
			if task.AssignedToID == nil || *task.AssignedToID != *req.AssignedToID {
				CreateActivity(userID, "task_assigned", "task", task.ID,
					fmt.Sprintf("%s assigned task %s to %s", getUserName(userID), task.Title, user.Name))

				// Kirim notifikasi ke user baru yang diberi tugas
				var event models.Event
				database.DB.First(&event, task.EventID)
				go helpers.NotifyTaskAssigned(*req.AssignedToID, task.Title, event.Title, event.Slug)
			}
		}
		task.AssignedToID = req.AssignedToID
	}
	if req.DueDate != nil {
		task.DueDate = req.DueDate
	}

	// Simpan perubahan ke database
	if err := database.DB.Save(&task).Error; err != nil {
		log.Printf("Error updating task: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate tugas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Preload AssignedTo dan CreatedBy untuk response
	database.DB.Preload("AssignedTo").Preload("CreatedBy").First(&task, task.ID)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Tugas berhasil diupdate",
		Data:    task,
	})
}

// DeleteTask menghapus task
func DeleteTask(c *gin.Context) {
	taskID := c.Param("task_id")

	// Cek apakah task ada
	var task models.Task
	if err := database.DB.First(&task, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Tugas tidak ditemukan",
			Errors:  map[string]string{"error": "Task not found"},
		})
		return
	}

	// Hapus dari database
	if err := database.DB.Delete(&task).Error; err != nil {
		log.Printf("Error deleting task: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus tugas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Tugas berhasil dihapus",
		Data:    nil,
	})
}

// UploadProof mengupload bukti pengerjaan task (hanya user yang ditugaskan)
func UploadProof(c *gin.Context) {
	taskID := c.Param("task_id")

	// Ambil user ID dari context (dari middleware)
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
			Errors:  map[string]string{"error": "User ID not found in token"},
		})
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
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Invalid user ID",
			Errors:  map[string]string{"error": "Invalid user ID type"},
		})
		return
	}

	// Cek apakah task ada
	var task models.Task
	if err := database.DB.First(&task, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Tugas tidak ditemukan",
			Errors:  map[string]string{"error": "Task not found"},
		})
		return
	}

	// Cek apakah user yang login adalah user yang ditugaskan
	if task.AssignedToID == nil || *task.AssignedToID != userID {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Anda tidak memiliki izin untuk upload bukti tugas ini",
			Errors:  map[string]string{"error": "Only assigned user can upload proof"},
		})
		return
	}

	// Handle Upload File
	file, err := c.FormFile("proof_file")
	if err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "File bukti wajib diupload",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Validasi file type (hanya gambar dan PDF)
	allowedExts := []string{".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}
	ext := filepath.Ext(file.Filename)
	allowed := false
	for _, allowedExt := range allowedExts {
		if ext == allowedExt {
			allowed = true
			break
		}
	}
	if !allowed {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Format file tidak didukung. Hanya gambar (jpg, png, gif, webp) dan PDF",
			Errors:  map[string]string{"error": "Invalid file format"},
		})
		return
	}

	// Pastikan folder tasks/proofs ada
	proofDir := "public/tasks/proofs"
	if _, err := os.Stat(proofDir); os.IsNotExist(err) {
		os.MkdirAll(proofDir, 0755)
	}

	// Generate nama file unik
	filename := fmt.Sprintf("proof-task-%d-%d-%s", task.ID, time.Now().Unix(), uuid.New().String()[:8])
	filename = filename + ext
	savePath := filepath.Join(proofDir, filename)

	// Simpan file
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		log.Printf("Error saving proof file: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menyimpan file bukti",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Update task dengan proof file path
	proofURL := fmt.Sprintf("http://localhost:8000/public/tasks/proofs/%s", filename)
	task.ProofFile = proofURL

	if err := database.DB.Save(&task).Error; err != nil {
		log.Printf("Error updating task proof: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate bukti tugas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Log activity untuk file uploaded
	var assignedUser models.User
	if task.AssignedToID != nil {
		database.DB.First(&assignedUser, *task.AssignedToID)
		CreateActivity(userID, "file_uploaded", "task", task.ID,
			fmt.Sprintf("%s uploaded file to %s", assignedUser.Name, task.Title))
	}

	// Preload AssignedTo dan CreatedBy untuk response
	database.DB.Preload("AssignedTo").Preload("CreatedBy").First(&task, task.ID)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Bukti pengerjaan berhasil diupload",
		Data:    task,
	})
}

// UpdateComments mengupdate komentar task (hanya user yang ditugaskan atau admin)
func UpdateComments(c *gin.Context) {
	taskID := c.Param("task_id")

	var req struct {
		Comments string `json:"comments" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validasi Errors",
			Errors:  map[string]string{"error": "Comments wajib diisi"},
		})
		return
	}

	// Ambil user ID dari context
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
			Errors:  map[string]string{"error": "User ID not found in token"},
		})
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
	}

	// Cek apakah task ada
	var task models.Task
	if err := database.DB.First(&task, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Tugas tidak ditemukan",
			Errors:  map[string]string{"error": "Task not found"},
		})
		return
	}

	// Cek apakah user yang login adalah user yang ditugaskan atau admin
	var user models.User
	if err := database.DB.Preload("Role").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "User tidak ditemukan",
			Errors:  map[string]string{"error": "User not found"},
		})
		return
	}

	// Check permission: assigned user atau admin (superadmin/kahim)
	isAssignedUser := task.AssignedToID != nil && *task.AssignedToID == userID
	isAdmin := user.Role.Code == "superadmin" || user.Role.Code == "kahim"

	if !isAssignedUser && !isAdmin {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Anda tidak memiliki izin untuk mengupdate komentar tugas ini",
			Errors:  map[string]string{"error": "Only assigned user or admin can update comments"},
		})
		return
	}

	// Parse existing comments JSON (chat style)
	type CommentEntry struct {
		UserID    uint      `json:"user_id"`
		Name      string    `json:"name"`
		Text      string    `json:"text"`
		CreatedAt time.Time `json:"created_at"`
	}

	var existing []CommentEntry
	if task.Comments != "" {
		_ = json.Unmarshal([]byte(task.Comments), &existing)
	}

	existing = append(existing, CommentEntry{
		UserID:    user.ID,
		Name:      user.Name,
		Text:      req.Comments,
		CreatedAt: time.Now(),
	})

	commentsJSON, _ := json.Marshal(existing)
	task.Comments = string(commentsJSON)

	if err := database.DB.Save(&task).Error; err != nil {
		log.Printf("Error updating task comments: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate komentar",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Log activity untuk comment added
	CreateActivity(userID, "comment_added", "task", task.ID,
		fmt.Sprintf("%s commented on %s", user.Name, task.Title))

	// Preload AssignedTo dan CreatedBy untuk response
	database.DB.Preload("AssignedTo").Preload("CreatedBy").First(&task, task.ID)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Komentar berhasil diupdate",
		Data:    task,
	})
}

// Helper function untuk check permission edit task
func canEditTask(userID uint, task models.Task) bool {
	// Get user dengan role
	var user models.User
	if err := database.DB.Preload("Role").First(&user, userID).Error; err != nil {
		return false
	}

	// Hanya Super Admin atau Ketua Himpunan yang bisa edit
	return user.Role.Code == "superadmin" || user.Role.Code == "kahim"
}
