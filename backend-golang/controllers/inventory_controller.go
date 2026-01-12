package controllers

import (
	"fmt"
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

// Helper function to check if user is logistik or super admin
func isLogistikOrAdmin(userID uint) bool {
	var user models.User
	if err := database.DB.Preload("Role").First(&user, userID).Error; err != nil {
		return false
	}
	// Super Admin (role_id 1) atau role dengan code "logistik"
	return user.RoleID == 1 || user.Role.Code == "logistik"
}

// Helper function to check if user is committee member of event
func isEventCommittee(userID uint, eventID uint) bool {
	var committeeMember models.CommitteeMember
	if err := database.DB.Where("event_id = ? AND user_id = ?", eventID, userID).First(&committeeMember).Error; err == nil {
		return true
	}
	return false
}

// ==================== INVENTORY CRUD ====================

type CreateInventoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	TotalStock  int    `json:"total_stock" binding:"required,min=0"`
	Condition   string `json:"condition"`
	ImageURL    string `json:"image_url"`
}

type UpdateInventoryRequest struct {
	Name           *string `json:"name"`
	Description    *string `json:"description"`
	TotalStock     *int    `json:"total_stock"`
	AvailableStock *int    `json:"available_stock"`
	Condition      *string `json:"condition"`
	ImageURL       *string `json:"image_url"`
}

// CreateItem creates a new inventory item
func CreateItem(c *gin.Context) {
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

	if !isLogistikOrAdmin(userID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Admin atau Logistik yang dapat menambah barang",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	var req CreateInventoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validasi gagal",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Set default condition
	condition := req.Condition
	if condition == "" {
		condition = "Good"
	}

	// AvailableStock sama dengan TotalStock saat pertama dibuat
	inventory := models.Inventory{
		Name:           req.Name,
		Description:    req.Description,
		TotalStock:     req.TotalStock,
		AvailableStock: req.TotalStock, // Saat pertama dibuat, semua stok tersedia
		Condition:      condition,
		ImageURL:       req.ImageURL,
	}

	if err := database.DB.Create(&inventory).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal membuat barang",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Barang berhasil ditambahkan",
		Data:    inventory,
	})
}

// GetItems returns list of all inventory items
func GetItems(c *gin.Context) {
	var items []models.Inventory
	if err := database.DB.Order("created_at DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data barang",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Daftar barang",
		Data:    items,
	})
}

// UpdateItem updates an inventory item
func UpdateItem(c *gin.Context) {
	itemID := c.Param("id")

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

	if !isLogistikOrAdmin(userID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Admin atau Logistik yang dapat mengubah barang",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	var inventory models.Inventory
	if err := database.DB.First(&inventory, itemID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Barang tidak ditemukan",
			Errors:  map[string]string{"error": "inventory not found"},
		})
		return
	}

	var req UpdateInventoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Validasi gagal",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Update fields
	if req.Name != nil {
		inventory.Name = *req.Name
	}
	if req.Description != nil {
		inventory.Description = *req.Description
	}
	if req.TotalStock != nil {
		// Jika TotalStock dikurangi, pastikan AvailableStock tidak melebihi TotalStock
		if *req.TotalStock < inventory.AvailableStock {
			inventory.AvailableStock = *req.TotalStock
		}
		inventory.TotalStock = *req.TotalStock
	}
	if req.AvailableStock != nil {
		// Validasi: AvailableStock tidak boleh melebihi TotalStock
		if *req.AvailableStock > inventory.TotalStock {
			c.JSON(http.StatusBadRequest, structs.ErrorResponse{
				Success: false,
				Message: "Stok tersedia tidak boleh melebihi stok total",
				Errors:  map[string]string{"available_stock": "Stok tersedia melebihi stok total"},
			})
			return
		}
		inventory.AvailableStock = *req.AvailableStock
	}
	if req.Condition != nil {
		inventory.Condition = *req.Condition
	}
	if req.ImageURL != nil {
		inventory.ImageURL = *req.ImageURL
	}

	// Handle optional image upload
	file, err := c.FormFile("image")
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

		imageDir := "public/images"
		if _, err := os.Stat(imageDir); os.IsNotExist(err) {
			os.MkdirAll(imageDir, 0755)
		}

		filename := fmt.Sprintf("inventory-%d-%d-%s%s", inventory.ID, time.Now().Unix(), uuid.New().String()[:8], ext)
		savePath := filepath.Join(imageDir, filename)

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
				Success: false,
				Message: "Gagal menyimpan gambar",
				Errors:  map[string]string{"error": err.Error()},
			})
			return
		}

		inventory.ImageURL = fmt.Sprintf("http://localhost:8000/public/images/%s", filename)
	}

	if err := database.DB.Save(&inventory).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate barang",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Barang berhasil diupdate",
		Data:    inventory,
	})
}

// DeleteItem deletes an inventory item
func DeleteItem(c *gin.Context) {
	itemID := c.Param("id")

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

	if !isLogistikOrAdmin(userID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Admin atau Logistik yang dapat menghapus barang",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	var inventory models.Inventory
	if err := database.DB.First(&inventory, itemID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Barang tidak ditemukan",
			Errors:  map[string]string{"error": "inventory not found"},
		})
		return
	}

	// Cek apakah ada loan yang masih aktif (pending atau approved) untuk item ini
	var activeLoanItems int64
	database.DB.Model(&models.LoanItem{}).
		Joins("JOIN loans ON loan_items.loan_id = loans.id").
		Where("loan_items.inventory_id = ? AND loans.status IN (?, ?)", itemID, "pending", "approved").
		Count(&activeLoanItems)

	if activeLoanItems > 0 {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Tidak dapat menghapus barang yang sedang dipinjam",
			Errors:  map[string]string{"error": "item is currently on loan"},
		})
		return
	}

	if err := database.DB.Delete(&inventory).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus barang",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Barang berhasil dihapus",
		Data:    nil,
	})
}

// ==================== LOAN MANAGEMENT ====================

type RequestLoanRequest struct {
	Items      []LoanItemRequest `json:"items" binding:"required,min=1"`
	LoanDate   string            `json:"loan_date" binding:"required"`
	ReturnDate string            `json:"return_date" binding:"required"`
	Notes      string            `json:"notes"`
}

type LoanItemRequest struct {
	ItemName    string `json:"item_name" binding:"required"`      // Nama barang
	Quantity    int    `json:"quantity" binding:"required,min=1"` // Jumlah
	Supplier    string `json:"supplier"`                          // Pemberi pinjaman/vendor
	Description string `json:"description"`                       // Deskripsi/keterangan
}

// RequestLoan creates a new loan request for an event
func RequestLoan(c *gin.Context) {
	eventID := c.Param("event_id")

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

	// Cek apakah event ada
	var event models.Event
	if err := database.DB.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Event tidak ditemukan",
			Errors:  map[string]string{"error": "event not found"},
		})
		return
	}

	// Cek apakah user adalah panitia dari event ini atau super admin
	if !isEventCommittee(userID, event.ID) && !isLogistikOrAdmin(userID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya panitia event atau admin yang dapat mengajukan peminjaman",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	var req RequestLoanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validasi gagal",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Parse dates
	loanDate, err := time.Parse("2006-01-02", req.LoanDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Format tanggal pinjam tidak valid (gunakan YYYY-MM-DD)",
			Errors:  map[string]string{"loan_date": "Invalid date format"},
		})
		return
	}

	returnDate, err := time.Parse("2006-01-02", req.ReturnDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Format tanggal kembali tidak valid (gunakan YYYY-MM-DD)",
			Errors:  map[string]string{"return_date": "Invalid date format"},
		})
		return
	}

	if returnDate.Before(loanDate) {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Tanggal kembali harus setelah tanggal pinjam",
			Errors:  map[string]string{"return_date": "Return date must be after loan date"},
		})
		return
	}

	// Validasi items (tidak perlu cek stok karena barang dari luar)
	for _, itemReq := range req.Items {
		if itemReq.ItemName == "" {
			c.JSON(http.StatusBadRequest, structs.ErrorResponse{
				Success: false,
				Message: "Nama barang wajib diisi",
				Errors:  map[string]string{"item_name": "Item name is required"},
			})
			return
		}
		if itemReq.Quantity <= 0 {
			c.JSON(http.StatusBadRequest, structs.ErrorResponse{
				Success: false,
				Message: "Jumlah barang harus lebih dari 0",
				Errors:  map[string]string{"quantity": "Quantity must be greater than 0"},
			})
			return
		}
	}

	// Buat loan request (satu event bisa punya multiple loan requests)
	loan := models.Loan{
		EventID:    event.ID,
		LoanDate:   loanDate,
		ReturnDate: returnDate,
		Status:     "pending",
		Notes:      req.Notes,
	}

	if err := database.DB.Create(&loan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal membuat request peminjaman",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Buat loan items
	for i, itemReq := range req.Items {
		// Pastikan ItemName tidak kosong
		if itemReq.ItemName == "" {
			c.JSON(http.StatusBadRequest, structs.ErrorResponse{
				Success: false,
				Message: fmt.Sprintf("Nama barang wajib diisi untuk item ke-%d", i+1),
				Errors:  map[string]string{"item_name": "Item name is required"},
			})
			return
		}

		loanItem := models.LoanItem{
			LoanID:      loan.ID,
			ItemName:    itemReq.ItemName,
			Quantity:    itemReq.Quantity,
			Supplier:    itemReq.Supplier,
			Description: itemReq.Description,
		}
		if err := database.DB.Create(&loanItem).Error; err != nil {
			c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
				Success: false,
				Message: fmt.Sprintf("Gagal menambahkan item peminjaman: %s", err.Error()),
				Errors:  map[string]string{"error": err.Error(), "item_index": fmt.Sprintf("%d", i+1)},
			})
			return
		}
	}

	// Preload relations untuk response
	database.DB.Preload("Items").Preload("Event").First(&loan, loan.ID)

	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Request peminjaman berhasil dibuat",
		Data:    loan,
	})
}

// GetEventLoan returns loan requests for a specific event (bisa multiple)
func GetEventLoan(c *gin.Context) {
	eventID := c.Param("event_id")

	var loans []models.Loan
	if err := database.DB.Preload("Items").Preload("Event").
		Where("event_id = ?", eventID).Order("created_at DESC").Find(&loans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data peminjaman",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Jika tidak ada loan, return empty array (bukan error)
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data peminjaman event",
		Data:    loans,
	})
}

// ApproveLoan approves a loan request (only for logistik/admin)
func ApproveLoan(c *gin.Context) {
	loanID := c.Param("id")

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

	if !isLogistikOrAdmin(userID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Admin atau Logistik yang dapat menyetujui peminjaman",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	var loan models.Loan
	if err := database.DB.Preload("Items").First(&loan, loanID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Peminjaman tidak ditemukan",
			Errors:  map[string]string{"error": "loan not found"},
		})
		return
	}

	if loan.Status != "pending" {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Peminjaman ini sudah diproses",
			Errors:  map[string]string{"error": "loan already processed"},
		})
		return
	}

	// Update status (tidak perlu kurangi stok karena barang dari luar)
	loan.Status = "approved"
	if err := database.DB.Save(&loan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menyetujui peminjaman",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Preload relations untuk response
	database.DB.Preload("Items").Preload("Event").First(&loan, loan.ID)

	// Kirim notifikasi ke semua panitia event bahwa loan approved
	go helpers.NotifyLoanApproved(loan.EventID, loan.Event.Title, loan.Event.Slug)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Peminjaman berhasil disetujui",
		Data:    loan,
	})
}

// RejectLoan rejects a loan request
func RejectLoan(c *gin.Context) {
	loanID := c.Param("id")

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

	if !isLogistikOrAdmin(userID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Admin atau Logistik yang dapat menolak peminjaman",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	var loan models.Loan
	if err := database.DB.First(&loan, loanID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Peminjaman tidak ditemukan",
			Errors:  map[string]string{"error": "loan not found"},
		})
		return
	}

	if loan.Status != "pending" {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Peminjaman ini sudah diproses",
			Errors:  map[string]string{"error": "loan already processed"},
		})
		return
	}

	loan.Status = "rejected"
	if err := database.DB.Save(&loan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menolak peminjaman",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Preload event untuk notifikasi
	database.DB.Preload("Event").First(&loan, loan.ID)

	// Kirim notifikasi ke semua panitia event bahwa loan rejected
	go helpers.NotifyLoanRejected(loan.EventID, loan.Event.Title, loan.Event.Slug)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Peminjaman ditolak",
		Data:    loan,
	})
}

// ReturnLoan marks a loan as returned and restores stock
func ReturnLoan(c *gin.Context) {
	loanID := c.Param("id")

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

	if !isLogistikOrAdmin(userID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Admin atau Logistik yang dapat menandai pengembalian",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	var loan models.Loan
	if err := database.DB.Preload("Items").First(&loan, loanID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Peminjaman tidak ditemukan",
			Errors:  map[string]string{"error": "loan not found"},
		})
		return
	}

	if loan.Status != "approved" {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Hanya peminjaman yang sudah disetujui yang dapat dikembalikan",
			Errors:  map[string]string{"error": "loan must be approved first"},
		})
		return
	}

	// Update status (tidak perlu kembalikan stok karena barang dari luar)
	loan.Status = "returned"
	if err := database.DB.Save(&loan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menandai pengembalian",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Preload relations untuk response
	database.DB.Preload("Items").Preload("Event").First(&loan, loan.ID)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Pengembalian berhasil dicatat",
		Data:    loan,
	})
}

// GetAllLoans returns all loan requests (for logistik/admin dashboard)
func GetAllLoans(c *gin.Context) {
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

	if !isLogistikOrAdmin(userID) {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Hanya Admin atau Logistik yang dapat melihat semua peminjaman",
			Errors:  map[string]string{"error": "forbidden"},
		})
		return
	}

	status := c.Query("status") // Optional filter by status

	var loans []models.Loan
	query := database.DB.Preload("Items").Preload("Event").Order("created_at DESC")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&loans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data peminjaman",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Daftar peminjaman",
		Data:    loans,
	})
}
