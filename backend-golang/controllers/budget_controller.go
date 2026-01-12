package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// isBudgetManager checks if user can manage budget for a specific event
// Returns true if:
// 1. User is Super Admin (role_id 1) or Bendahara Umum (role_id 3), OR
// 2. User is a committee member of the event
func isBudgetManager(userID uint, eventID uint) bool {
	var user models.User
	if err := database.DB.Select("id", "role_id").First(&user, userID).Error; err != nil {
		return false
	}
	
	// Super Admin atau Bendahara Umum bisa manage semua budget
	if user.RoleID == 1 || user.RoleID == 3 {
		return true
	}
	
	// Cek apakah user adalah panitia dari event ini
	var committeeMember models.CommitteeMember
	if err := database.DB.Where("event_id = ? AND user_id = ?", eventID, userID).First(&committeeMember).Error; err == nil {
		return true
	}
	
	return false
}

type CreateBudgetRequest struct {
	Division   string  `form:"division" json:"division" binding:"required"`
	ItemName   string  `form:"item_name" json:"item_name" binding:"required"`
	Quantity   int     `form:"quantity" json:"quantity" binding:"required"`
	PlanAmount float64 `form:"plan_amount" json:"plan_amount" binding:"required"`
}

type UpdateBudgetRequest struct {
	Division   *string  `form:"division" json:"division"`
	ItemName   *string  `form:"item_name" json:"item_name"`
	Quantity   *int     `form:"quantity" json:"quantity"`
	PlanAmount *float64 `form:"plan_amount" json:"plan_amount"`
	RealAmount *float64 `form:"real_amount" json:"real_amount"`
}

// GetBudgets returns list of budgets for a specific event.
func GetBudgets(c *gin.Context) {
	eventID := c.Param("event_id")

	var budgets []models.Budget
	if err := database.DB.Where("event_id = ?", eventID).Order("created_at DESC").Find(&budgets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data anggaran",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Daftar anggaran event",
		Data:    budgets,
	})
}

// CreateBudget adds a new budget row for an event.
func CreateBudget(c *gin.Context) {
	eventID := c.Param("event_id")
	var req CreateBudgetRequest

	userIDValue, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
			Errors:  map[string]string{"error": "User ID not found in token"},
		})
		return
	}
	var userID uint
	switch v := userIDValue.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	case int:
		userID = uint(v)
	}
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validasi gagal, pastikan semua field diisi",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Pastikan event ada
	var event models.Event
	if err := database.DB.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Event tidak ditemukan",
			Errors:  map[string]string{"error": "event not found"},
		})
		return
	}

	// Cek permission setelah event ditemukan
	if !isBudgetManager(userID, event.ID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Super Admin, Bendahara Umum, atau Panitia event yang dapat menambah anggaran",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	budget := models.Budget{
		EventID:    event.ID,
		Division:   req.Division,
		ItemName:   req.ItemName,
		Quantity:   req.Quantity,
		PlanAmount: req.PlanAmount,
		Status:     "pending",
	}

	if err := database.DB.Create(&budget).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal membuat anggaran",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Anggaran berhasil dibuat",
		Data:    budget,
	})
}

// UpdateBudget updates realisation amount, proof image, or other budget fields.
func UpdateBudget(c *gin.Context) {
	budgetID := c.Param("id")

	var budget models.Budget
	if err := database.DB.First(&budget, budgetID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Anggaran tidak ditemukan",
			Errors:  map[string]string{"error": "budget not found"},
		})
		return
	}

	userIDValue, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
			Errors:  map[string]string{"error": "User ID not found in token"},
		})
		return
	}
	var userID uint
	switch v := userIDValue.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	case int:
		userID = uint(v)
	}
	
	// Cek permission dengan eventID dari budget
	if !isBudgetManager(userID, budget.EventID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Super Admin, Bendahara Umum, atau Panitia event yang dapat mengubah anggaran",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	var req UpdateBudgetRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Validasi gagal",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	if req.Division != nil {
		budget.Division = *req.Division
	}
	if req.ItemName != nil {
		budget.ItemName = *req.ItemName
	}
	if req.Quantity != nil {
		budget.Quantity = *req.Quantity
	}
	if req.PlanAmount != nil {
		budget.PlanAmount = *req.PlanAmount
	}
	if req.RealAmount != nil {
		budget.RealAmount = *req.RealAmount
	}

	// Handle optional proof image upload
	file, err := c.FormFile("proof_image")
	if err == nil && file != nil {
		allowedExts := []string{".jpg", ".jpeg", ".png", ".gif", ".webp"}
		ext := filepath.Ext(file.Filename)
		allowed := false
		for _, e := range allowedExts {
			if ext == e {
				allowed = true
				break
			}
		}
		if !allowed {
			c.JSON(http.StatusBadRequest, structs.ErrorResponse{
				Success: false,
				Message: "Format file tidak didukung. Gunakan jpg, jpeg, png, gif, atau webp",
				Errors:  map[string]string{"error": "invalid file format"},
			})
			return
		}

		proofDir := "public/proofs"
		if _, err := os.Stat(proofDir); os.IsNotExist(err) {
			os.MkdirAll(proofDir, 0755)
		}

		filename := fmt.Sprintf("proof-budget-%d-%d-%s%s", budget.ID, time.Now().Unix(), uuid.New().String()[:8], ext)
		savePath := filepath.Join(proofDir, filename)

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
				Success: false,
				Message: "Gagal menyimpan file bukti",
				Errors:  map[string]string{"error": err.Error()},
			})
			return
		}

		budget.ProofImage = fmt.Sprintf("http://localhost:8000/public/proofs/%s", filename)
	}

	if err := database.DB.Save(&budget).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate anggaran",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Auto status: paid jika ada real_amount > 0, else pending (kecuali sudah rejected)
	if budget.Status != "rejected" {
		if budget.RealAmount > 0 {
			budget.Status = "paid"
		} else {
			budget.Status = "pending"
		}
		database.DB.Model(&budget).Update("status", budget.Status)
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Anggaran berhasil diupdate",
		Data:    budget,
	})
}

// DeleteBudget removes a budget row.
func DeleteBudget(c *gin.Context) {
	budgetID := c.Param("id")

	userIDValue, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Unauthorized",
			Errors:  map[string]string{"error": "User ID not found in token"},
		})
		return
	}
	var userID uint
	switch v := userIDValue.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	case int:
		userID = uint(v)
	}

	var budget models.Budget
	if err := database.DB.First(&budget, budgetID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Anggaran tidak ditemukan",
			Errors:  map[string]string{"error": "budget not found"},
		})
		return
	}

	// Cek permission dengan eventID dari budget
	if !isBudgetManager(userID, budget.EventID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Super Admin, Bendahara Umum, atau Panitia event yang dapat menandai anggaran rejected",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	// Soft delete: ubah status menjadi rejected
	budget.Status = "rejected"
	if err := database.DB.Save(&budget).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengubah status anggaran",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Anggaran ditandai sebagai rejected",
		Data:    budget,
	})
}
