package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
	"santrikoding/backend-api/config"
	"santrikoding/backend-api/models"

	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

// GetSnapToken menghasilkan snap token untuk pembayaran
// Returns: token, redirectURL, orderID, error
func GetSnapToken(registration models.Registration, user models.User, event models.Event) (string, string, string, error) {
	// Init snap client dengan Server Key
	serverKey := config.GetEnv("MIDTRANS_SERVER_KEY", "")
	if serverKey == "" {
		return "", "", "", fmt.Errorf("MIDTRANS_SERVER_KEY belum dikonfigurasi")
	}

	var snapClient snap.Client
	snapClient.New(serverKey, midtrans.Sandbox) // Mode sandbox

	// Tentukan harga event (harus > 0, jika tidak berarti event gratis dan tidak perlu payment)
	price := event.Price
	if price <= 0 {
		return "", "", "", fmt.Errorf("event ini gratis, tidak memerlukan pembayaran")
	}

	// Buat Order ID
	orderID := fmt.Sprintf("ORDER-%d-%d", registration.ID, time.Now().Unix())

	// Buat request Snap
	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  orderID,
			GrossAmt: int64(price),
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: user.Name,
			Email: user.Email,
		},
		Items: &[]midtrans.ItemDetails{
			{
				ID:    fmt.Sprintf("EVENT-%d", event.ID),
				Price: int64(price),
				Qty:   1,
				Name:  event.Title,
			},
		},
	}

	// Generate snap token
	snapResp, err := snapClient.CreateTransaction(req)
	if err != nil {
		return "", "", "", fmt.Errorf("gagal membuat snap token: %v", err)
	}

	return snapResp.Token, snapResp.RedirectURL, orderID, nil
}

// ParseOrderID untuk mengambil registration ID dari order ID
func ParseOrderID(orderID string) (uint, error) {
	// Format: "ORDER-{RegistrationID}-{UnixTime}"
	// Contoh: "ORDER-123-1704067200"
	
	// Hapus prefix "ORDER-"
	if len(orderID) < 6 || orderID[:6] != "ORDER-" {
		return 0, fmt.Errorf("format order ID tidak valid")
	}
	
	orderID = orderID[6:] // Hapus "ORDER-"
	
	// Cari posisi dash kedua (pemisah registration ID dan unix time)
	var registrationIDStr string
	for i, char := range orderID {
		if char == '-' {
			registrationIDStr = orderID[:i]
			break
		}
	}
	
	if registrationIDStr == "" {
		return 0, fmt.Errorf("format order ID tidak valid: tidak ada registration ID")
	}
	
	registrationID, err := strconv.ParseUint(registrationIDStr, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("gagal parsing registration ID: %v", err)
	}
	
	return uint(registrationID), nil
}

// CheckPaymentStatus mengecek status pembayaran dari Midtrans berdasarkan order ID
func CheckPaymentStatus(orderID string) (string, error) {
	serverKey := config.GetEnv("MIDTRANS_SERVER_KEY", "")
	if serverKey == "" {
		return "", fmt.Errorf("MIDTRANS_SERVER_KEY belum dikonfigurasi")
	}

	// Get transaction status dari Midtrans API
	client := &http.Client{Timeout: 10 * time.Second}
	
	url := fmt.Sprintf("https://api.sandbox.midtrans.com/v2/%s/status", orderID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	// Set header dengan Basic Auth (Server Key)
	req.SetBasicAuth(serverKey, "")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("gagal menghubungi Midtrans API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes := make([]byte, 1024)
		resp.Body.Read(bodyBytes)
		return "", fmt.Errorf("Midtrans API error: status %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("gagal parse response: %v", err)
	}

	transactionStatus, exists := result["transaction_status"]
	if !exists {
		return "", fmt.Errorf("transaction_status tidak ditemukan dalam response")
	}

	statusStr, ok := transactionStatus.(string)
	if !ok {
		return "", fmt.Errorf("transaction_status bukan string")
	}

	return statusStr, nil
}
