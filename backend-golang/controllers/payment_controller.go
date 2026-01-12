package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/services"
	"santrikoding/backend-api/structs"
	"time"

	"github.com/gin-gonic/gin"
)

// InitiatePayment memulai proses pembayaran dengan Midtrans
func InitiatePayment(c *gin.Context) {
	registrationID := c.Param("id")
	var registration models.Registration

	// Ambil data registration dengan preload user dan event
	if err := database.DB.Preload("User").Preload("Event").First(&registration, registrationID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Registrasi tidak ditemukan",
			Errors:  map[string]string{"error": "Registration not found"},
		})
		return
	}

	// Cek apakah sudah dibayar
	if registration.PaidAt.Unix() > 0 {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Pembayaran sudah dilakukan",
			Errors:  map[string]string{"error": "Payment already completed"},
		})
		return
	}

	// Cek apakah status sudah confirmed
	if registration.Status == "confirmed" {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Registrasi sudah dikonfirmasi",
			Errors:  map[string]string{"error": "Registration already confirmed"},
		})
		return
	}

	// Generate snap token (akan return order ID juga)
	token, redirectURL, orderID, err := services.GetSnapToken(registration, registration.User, registration.Event)
	if err != nil {
		log.Printf("Error generating snap token: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal membuat token pembayaran",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Simpan token dan order ID ke database
	registration.PaymentToken = token
	registration.PaymentURL = redirectURL
	registration.OrderID = orderID
	if err := database.DB.Save(&registration).Error; err != nil {
		log.Printf("Error saving payment token: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menyimpan token pembayaran",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Return token ke frontend
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Token pembayaran berhasil dibuat",
		Data: gin.H{
			"token":        token,
			"redirect_url": redirectURL,
		},
	})
}

// HandleNotification menangani webhook notifikasi dari Midtrans
func HandleNotification(c *gin.Context) {
	var notificationPayload map[string]interface{}

	// Bind notification payload
	if err := c.ShouldBindJSON(&notificationPayload); err != nil {
		log.Printf("Error binding notification payload: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification payload"})
		return
	}

	// Log notification untuk debugging
	notificationJSON, _ := json.MarshalIndent(notificationPayload, "", "  ")
	log.Printf("Received Midtrans notification: %s", string(notificationJSON))

	// Extract order ID
	orderID, exists := notificationPayload["order_id"]
	if !exists {
		log.Println("Order ID tidak ditemukan dalam notification")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order ID not found"})
		return
	}

	orderIDStr, ok := orderID.(string)
	if !ok {
		log.Println("Order ID bukan string")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID type"})
		return
	}

	// Parse registration ID dari order ID
	registrationID, err := services.ParseOrderID(orderIDStr)
	if err != nil {
		log.Printf("Error parsing order ID: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID format"})
		return
	}

	// Ambil data registration
	var registration models.Registration
	if err := database.DB.First(&registration, registrationID).Error; err != nil {
		log.Printf("Registration not found: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Registration not found"})
		return
	}

	// Cek status transaksi
	transactionStatus, exists := notificationPayload["transaction_status"]
	if !exists {
		log.Println("Transaction status tidak ditemukan")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Transaction status not found"})
		return
	}

	statusStr, ok := transactionStatus.(string)
	if !ok {
		log.Println("Transaction status bukan string")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction status type"})
		return
	}

	var fraudStatus string
	if fraudStatusVal, exists := notificationPayload["fraud_status"]; exists {
		if fraudStr, ok := fraudStatusVal.(string); ok {
			fraudStatus = fraudStr
		}
	}

	log.Printf("Payment notification - Order ID: %s, Status: %s, Fraud: %s", orderIDStr, statusStr, fraudStatus)

	// Update status berdasarkan transaction status
	// Preload Event untuk notifikasi
	database.DB.Preload("Event").First(&registration, registration.ID)

	switch statusStr {
	case "settlement", "capture":
		// Pembayaran sukses
		// Di sandbox, biasanya langsung settlement tanpa perlu cek fraud_status
		if fraudStatus == "" || fraudStatus == "accept" {
			registration.Status = "confirmed"
			registration.PaidAt = time.Now()
			if err := database.DB.Save(&registration).Error; err != nil {
				log.Printf("Error updating registration: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update registration"})
				return
			}
			log.Printf("Registration %d confirmed - Payment successful", registrationID)

			// Catat aktivitas pembayaran berhasil
			CreateActivity(registration.UserID, "payment_completed", "event", registration.Event.ID,
				"menyelesaikan pembayaran event "+registration.Event.Title)

			// Kirim notifikasi payment success ke peserta
			go helpers.NotifyPaymentSuccess(registration.UserID, registration.Event.Title, registration.Event.Slug)
		} else if fraudStatus == "challenge" {
			// Jika fraud status challenge, biarkan pending (butuh verifikasi manual)
			log.Printf("Registration %d - Payment challenged (fraud check)", registrationID)
		}
	case "deny", "expire", "cancel":
		// Pembayaran ditolak/dibatalkan
		registration.Status = "rejected"
		if err := database.DB.Save(&registration).Error; err != nil {
			log.Printf("Error updating registration: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update registration"})
			return
		}
		log.Printf("Registration %d rejected - Payment %s", registrationID, statusStr)

		// Kirim notifikasi payment gagal
		go helpers.NotifyRegistrationRejected(registration.UserID, registration.Event.Title, "Pembayaran dibatalkan atau expired")
	case "pending":
		// Pembayaran masih pending (belum ada perubahan)
		log.Printf("Registration %d - Payment still pending", registrationID)

		// Kirim notifikasi payment pending
		go helpers.NotifyPaymentPending(registration.UserID, registration.Event.Title, registration.Event.Slug)
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// CheckPaymentStatus mengecek status pembayaran dari Midtrans dan update jika perlu
func CheckPaymentStatus(c *gin.Context) {
	registrationID := c.Param("id")
	var registration models.Registration

	// Ambil data registration
	if err := database.DB.First(&registration, registrationID).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Registrasi tidak ditemukan",
			Errors:  map[string]string{"error": "Registration not found"},
		})
		return
	}

	// Jika sudah confirmed, langsung return
	if registration.Status == "confirmed" && registration.PaidAt.Unix() > 0 {
		c.JSON(http.StatusOK, structs.SuccessResponse{
			Success: true,
			Message: "Pembayaran sudah dikonfirmasi",
			Data: gin.H{
				"status":  registration.Status,
				"paid_at": registration.PaidAt,
			},
		})
		return
	}

	// Cek apakah sudah ada order ID
	if registration.OrderID == "" {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Pembayaran belum diinisiasi",
			Errors:  map[string]string{"error": "Payment not initiated"},
		})
		return
	}

	// Check status dari Midtrans API
	transactionStatus, err := services.CheckPaymentStatus(registration.OrderID)
	if err != nil {
		log.Printf("Error checking payment status: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengecek status pembayaran",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	log.Printf("Payment status check - Order ID: %s, Status: %s", registration.OrderID, transactionStatus)

	// Update status berdasarkan transaction status
	updated := false
	switch transactionStatus {
	case "settlement", "capture":
		// Pembayaran sukses - langsung update tanpa perlu cek fraud di check status
		if registration.Status != "confirmed" {
			registration.Status = "confirmed"
			registration.PaidAt = time.Now()
			if err := database.DB.Save(&registration).Error; err != nil {
				log.Printf("Error updating registration: %v", err)
				c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
					Success: false,
					Message: "Gagal mengupdate status registrasi",
					Errors:  map[string]string{"error": err.Error()},
				})
				return
			}
			updated = true
			log.Printf("Registration %d confirmed - Payment successful", registrationID)
		}
	case "deny", "expire", "cancel":
		// Pembayaran ditolak/dibatalkan
		if registration.Status != "rejected" {
			registration.Status = "rejected"
			if err := database.DB.Save(&registration).Error; err != nil {
				log.Printf("Error updating registration: %v", err)
				c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
					Success: false,
					Message: "Gagal mengupdate status registrasi",
					Errors:  map[string]string{"error": err.Error()},
				})
				return
			}
			updated = true
			log.Printf("Registration %d rejected - Payment %s", registrationID, transactionStatus)
		}
	case "pending":
		// Pembayaran masih pending
		log.Printf("Registration %d - Payment still pending", registrationID)
	}

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: func() string {
			if updated {
				return "Status pembayaran berhasil diupdate"
			}
			return "Status pembayaran: " + transactionStatus
		}(),
		Data: gin.H{
			"status":             registration.Status,
			"transaction_status": transactionStatus,
			"paid_at":            registration.PaidAt,
			"updated":            updated,
		},
	})
}
