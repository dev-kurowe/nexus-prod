package controllers

import (
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
)

// UploadCertificate untuk upload sertifikat gambar per peserta
func UploadCertificate(c *gin.Context) {
	registrationID := c.Param("registration_id")

	// 1. Ambil data registration
	var registration models.Registration
	if err := database.DB.Preload("User").Preload("Event").First(&registration, registrationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Pendaftaran tidak ditemukan"})
		return
	}

	// 2. Handle Upload File
	file, err := c.FormFile("certificate")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "File sertifikat wajib diupload", "error": err.Error()})
		return
	}

	// Validasi file type (hanya gambar)
	allowedExts := []string{".jpg", ".jpeg", ".png", ".gif", ".webp"}
	ext := filepath.Ext(file.Filename)
	allowed := false
	for _, allowedExt := range allowedExts {
		if ext == allowedExt {
			allowed = true
			break
		}
	}
	if !allowed {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Format file tidak didukung. Hanya gambar (jpg, png, gif, webp)"})
		return
	}

	// 3. Pastikan folder certificates ada
	certDir := "public/certificates"
	if _, err := os.Stat(certDir); os.IsNotExist(err) {
		os.MkdirAll(certDir, 0755)
	}

	// 4. Generate nama file unik
	filename := fmt.Sprintf("cert-%s-%d%s", registration.QRCode, time.Now().Unix(), ext)
	savePath := filepath.Join(certDir, filename)

	// 5. Simpan file
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan file sertifikat"})
		return
	}

	// 6. Generate certificate code
	certificateCode := fmt.Sprintf("CERT-%s-%s", registration.QRCode, uuid.New().String()[:8])
	certificateURL := fmt.Sprintf("http://localhost:8000/public/certificates/%s", filename)

	// 7. Simpan atau update ke database
	var certificate models.Certificate
	if err := database.DB.Where("registration_id = ?", registrationID).First(&certificate).Error; err != nil {
		// Buat baru
		certificate = models.Certificate{
			RegistrationID:  registration.ID,
			CertificateURL:  certificateURL,
			CertificateCode: certificateCode,
			UploadedAt:      time.Now(),
			EmailSent:       false,
		}
		if err := database.DB.Create(&certificate).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menyimpan data sertifikat"})
			return
		}
	} else {
		// Update existing
		certificate.CertificateURL = certificateURL
		certificate.CertificateCode = certificateCode
		certificate.UploadedAt = time.Now()
		certificate.EmailSent = false // Reset status email jika upload ulang
		certificate.EmailSentAt = nil
		if err := database.DB.Save(&certificate).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal update data sertifikat"})
			return
		}
	}

	// 8. Update registration dengan certificate URL
	registration.CertificateURL = certificateURL
	database.DB.Save(&registration)

	// 9. Kirim notifikasi ke peserta bahwa sertifikat sudah ready
	go helpers.NotifyCertificateReady(registration.UserID, registration.Event.Title, registration.Event.Slug)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Sertifikat berhasil diupload",
		"data": gin.H{
			"certificate_url":  certificateURL,
			"certificate_code": certificateCode,
		},
	})
}

// SendCertificateEmail untuk kirim sertifikat via email ke peserta
func SendCertificateEmail(c *gin.Context) {
	registrationID := c.Param("registration_id")

	// 1. Ambil data certificate dan registration
	var certificate models.Certificate
	if err := database.DB.Preload("Registration.User").Preload("Registration.Event").
		Where("registration_id = ?", registrationID).First(&certificate).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Sertifikat tidak ditemukan"})
		return
	}

	if certificate.CertificateURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Sertifikat belum diupload"})
		return
	}

	// 2. Kirim email (TODO: Implementasi email service)
	// Untuk sekarang, kita hanya update status
	now := time.Now()
	certificate.EmailSent = true
	certificate.EmailSentAt = &now
	database.DB.Save(&certificate)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Sertifikat berhasil dikirim ke email %s", certificate.Registration.User.Email),
		"data": gin.H{
			"email":         certificate.Registration.User.Email,
			"email_sent_at": now,
		},
	})
}

// SendCertificatesEmailBulk untuk kirim sertifikat ke banyak peserta sekaligus
func SendCertificatesEmailBulk(c *gin.Context) {
	eventID := c.Param("event_id")

	// Ambil semua sertifikat yang sudah diupload tapi belum dikirim
	var certificates []models.Certificate
	if err := database.DB.Preload("Registration.User").Preload("Registration.Event").
		Joins("JOIN registrations ON certificates.registration_id = registrations.id").
		Where("registrations.event_id = ? AND certificates.certificate_url != '' AND certificates.email_sent = ?", eventID, false).
		Find(&certificates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal mengambil data sertifikat"})
		return
	}

	if len(certificates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Tidak ada sertifikat yang perlu dikirim. Pastikan sertifikat sudah diupload.",
		})
		return
	}

	// Kirim email untuk setiap sertifikat
	successCount := 0
	failedCount := 0
	var failedEmails []string
	now := time.Now()

	for _, cert := range certificates {
		// TODO: Implementasi kirim email dengan attachment
		// Untuk sekarang, kita hanya update status
		cert.EmailSent = true
		cert.EmailSentAt = &now
		if err := database.DB.Save(&cert).Error; err != nil {
			failedCount++
			failedEmails = append(failedEmails, cert.Registration.User.Email)
			continue
		}
		successCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Berhasil mengirim %d email sertifikat", successCount),
		"data": gin.H{
			"success_count": successCount,
			"failed_count":  failedCount,
			"failed_emails": failedEmails,
		},
	})
}

// DownloadCertificate untuk download sertifikat
func DownloadCertificate(c *gin.Context) {
	registrationID := c.Param("registration_id")

	var certificate models.Certificate
	if err := database.DB.Preload("Registration.Event").Preload("Registration.User").Where("registration_id = ?", registrationID).First(&certificate).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Sertifikat tidak ditemukan"})
		return
	}

	if certificate.CertificateURL == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "Sertifikat belum diupload"})
		return
	}

	// Extract filename dari URL
	filename := filepath.Base(certificate.CertificateURL)
	filePath := filepath.Join("public", "certificates", filename)

	// Cek apakah file ada
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"message": "File sertifikat tidak ditemukan"})
		return
	}

	// Catat aktivitas download sertifikat
	CreateActivity(certificate.Registration.UserID, "certificate_downloaded", "event", certificate.Registration.EventID,
		"mendownload sertifikat event "+certificate.Registration.Event.Title)

	// Set header untuk download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "image/jpeg") // Bisa disesuaikan dengan tipe file
	c.File(filePath)
}

// GetCertificateByCode untuk validasi sertifikat
func GetCertificateByCode(c *gin.Context) {
	code := c.Param("code")

	var certificate models.Certificate
	if err := database.DB.Preload("Registration.User").Preload("Registration.Event").
		Where("certificate_code = ?", code).First(&certificate).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Sertifikat tidak valid"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"certificate_code": certificate.CertificateCode,
			"participant_name": certificate.Registration.User.Name,
			"event_title":      certificate.Registration.Event.Title,
			"event_date":       certificate.Registration.Event.StartDate,
			"uploaded_at":      certificate.UploadedAt,
		},
	})
}

// UploadCertificatesBulk untuk upload sertifikat secara bulk berdasarkan email
func UploadCertificatesBulk(c *gin.Context) {
	eventID := c.Param("event_id")

	// 1. Ambil data event untuk cek kuota
	var event models.Event
	if err := database.DB.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Event tidak ditemukan"})
		return
	}

	// 2. Ambil semua peserta event untuk validasi email
	var participants []models.Registration
	if err := database.DB.Preload("User").Where("event_id = ?", eventID).Find(&participants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengambil data peserta"})
		return
	}

	// 3. Buat map email -> registration untuk lookup cepat
	emailToRegistration := make(map[string]models.Registration)
	for _, p := range participants {
		if p.User.Email != "" {
			emailToRegistration[p.User.Email] = p
		}
	}

	// 4. Handle Upload Multiple Files
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Gagal membaca form data", "error": err.Error()})
		return
	}

	files := form.File["certificates"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Tidak ada file sertifikat yang diupload"})
		return
	}

	// 5. Validasi jumlah file tidak melebihi kuota event
	if len(files) > event.Quota {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": fmt.Sprintf("Jumlah file melebihi kuota event. Maksimal: %d file, yang diupload: %d file", event.Quota, len(files)),
		})
		return
	}

	// 6. Validasi file type dan pastikan folder certificates ada
	certDir := "public/certificates"
	if _, err := os.Stat(certDir); os.IsNotExist(err) {
		os.MkdirAll(certDir, 0755)
	}

	allowedExts := []string{".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}

	// 7. Process setiap file
	type Result struct {
		Email           string `json:"email"`
		Filename        string `json:"filename"`
		Success         bool   `json:"success"`
		Message         string `json:"message"`
		CertificateURL  string `json:"certificate_url,omitempty"`
		CertificateCode string `json:"certificate_code,omitempty"`
	}

	var results []Result
	now := time.Now()

	for _, file := range files {
		// Extract email dari nama file (format: email.ext atau email@domain.ext)
		filenameWithoutExt := strings.TrimSuffix(file.Filename, filepath.Ext(file.Filename))

		// Validasi format email dalam nama file (harus mengandung @)
		if !strings.Contains(filenameWithoutExt, "@") {
			results = append(results, Result{
				Email:    filenameWithoutExt,
				Filename: file.Filename,
				Success:  false,
				Message:  "Format nama file tidak valid. Nama file harus berupa email (contoh: rofi2425@gmail.com.pdf)",
			})
			continue
		}

		email := filenameWithoutExt

		// Validasi email ada di daftar peserta
		registration, exists := emailToRegistration[email]
		if !exists {
			results = append(results, Result{
				Email:    email,
				Filename: file.Filename,
				Success:  false,
				Message:  fmt.Sprintf("Email %s tidak terdaftar sebagai peserta event ini", email),
			})
			continue
		}

		// Validasi file type
		ext := filepath.Ext(file.Filename)
		allowed := false
		for _, allowedExt := range allowedExts {
			if strings.EqualFold(ext, allowedExt) {
				allowed = true
				break
			}
		}
		if !allowed {
			results = append(results, Result{
				Email:    email,
				Filename: file.Filename,
				Success:  false,
				Message:  fmt.Sprintf("Format file tidak didukung. Hanya gambar (jpg, png, gif, webp) dan PDF. File: %s", ext),
			})
			continue
		}

		// Generate nama file unik (email + timestamp untuk menghindari conflict)
		saveFilename := fmt.Sprintf("%s-%d%s", email, now.Unix(), ext)
		savePath := filepath.Join(certDir, saveFilename)

		// Simpan file
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			results = append(results, Result{
				Email:    email,
				Filename: file.Filename,
				Success:  false,
				Message:  fmt.Sprintf("Gagal menyimpan file: %v", err),
			})
			continue
		}

		// Generate certificate code
		certificateCode := fmt.Sprintf("CERT-%s-%s", registration.QRCode, uuid.New().String()[:8])
		certificateURL := fmt.Sprintf("http://localhost:8000/public/certificates/%s", saveFilename)

		// Simpan atau update ke database
		var certificate models.Certificate
		if err := database.DB.Where("registration_id = ?", registration.ID).First(&certificate).Error; err != nil {
			// Buat baru
			certificate = models.Certificate{
				RegistrationID:  registration.ID,
				CertificateURL:  certificateURL,
				CertificateCode: certificateCode,
				UploadedAt:      now,
				EmailSent:       false,
			}
			if err := database.DB.Create(&certificate).Error; err != nil {
				results = append(results, Result{
					Email:    email,
					Filename: file.Filename,
					Success:  false,
					Message:  fmt.Sprintf("Gagal menyimpan data sertifikat: %v", err),
				})
				// Hapus file yang sudah disimpan jika gagal simpan ke DB
				os.Remove(savePath)
				continue
			}
		} else {
			// Update existing
			// Hapus file lama jika ada
			if certificate.CertificateURL != "" {
				oldFilename := filepath.Base(certificate.CertificateURL)
				oldPath := filepath.Join(certDir, oldFilename)
				if _, err := os.Stat(oldPath); err == nil {
					os.Remove(oldPath)
				}
			}
			certificate.CertificateURL = certificateURL
			certificate.CertificateCode = certificateCode
			certificate.UploadedAt = now
			certificate.EmailSent = false
			certificate.EmailSentAt = nil
			if err := database.DB.Save(&certificate).Error; err != nil {
				results = append(results, Result{
					Email:    email,
					Filename: file.Filename,
					Success:  false,
					Message:  fmt.Sprintf("Gagal update data sertifikat: %v", err),
				})
				os.Remove(savePath)
				continue
			}
		}

		// Update registration dengan certificate URL
		registration.CertificateURL = certificateURL
		database.DB.Save(&registration)

		// Kirim notifikasi ke peserta bahwa sertifikat sudah ready
		go helpers.NotifyCertificateReady(registration.UserID, event.Title, event.Slug)

		results = append(results, Result{
			Email:           email,
			Filename:        file.Filename,
			Success:         true,
			Message:         "Sertifikat berhasil diupload. Silakan cek di tabel dan kirim email secara manual.",
			CertificateURL:  certificateURL,
			CertificateCode: certificateCode,
		})
	}

	// 8. Hitung statistik
	successCount := 0
	failedCount := 0
	for _, r := range results {
		if r.Success {
			successCount++
		} else {
			failedCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Upload selesai. Berhasil: %d, Gagal: %d", successCount, failedCount),
		"data": gin.H{
			"total_files":   len(files),
			"success_count": successCount,
			"failed_count":  failedCount,
			"results":       results,
		},
	})
}
