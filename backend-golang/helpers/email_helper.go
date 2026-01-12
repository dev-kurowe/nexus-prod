package helpers

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	gomail "gopkg.in/gomail.v2"
)

// SendSuccessEmail mengirimkan email konfirmasi pendaftaran secara async-safe
func SendSuccessEmail(toEmail string, userName string, eventName string, eventDate string, eventLocation string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("panic recovered in SendSuccessEmail: %v", r)
		}
	}()

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	if smtpHost == "" || smtpPortStr == "" || smtpEmail == "" || smtpPassword == "" {
		log.Println("SMTP config belum lengkap, email tidak dikirim")
		return
	}

	m := gomail.NewMessage()
	m.SetHeader("From", smtpEmail)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", fmt.Sprintf("Konfirmasi Pendaftaran: %s", eventName))

	body := fmt.Sprintf(`
		<!doctype html>
		<html>
		<head>
		  <meta charset="UTF-8">
		</head>
		<body style="font-family: Arial, sans-serif; background:#f6f9fc; padding:20px;">
		  <div style="max-width:520px; margin:0 auto; background:white; padding:20px 24px; border-radius:12px; border:1px solid #e5e7eb;">
			<h2 style="margin-top:0; color:#111827;">Halo %s,</h2>
			<p style="color:#374151;">Pendaftaran kamu telah <strong>berhasil dikonfirmasi</strong>! Berikut detail event:</p>
			<div style="background:#f3f4f6; padding:12px 14px; border-radius:10px; margin:16px 0;">
			  <p style="margin:4px 0; color:#111827;"><strong>Event:</strong> %s</p>
			  <p style="margin:4px 0; color:#111827;"><strong>Tanggal:</strong> %s</p>
			  <p style="margin:4px 0; color:#111827;"><strong>Lokasi:</strong> %s</p>
			</div>
			<p style="color:#374151;">Silakan cek dashboard untuk mengunduh tiket. Sampai jumpa di acara!</p>
			<p style="color:#6b7280; font-size:12px;">Email ini dikirim otomatis, mohon tidak membalas.</p>
		  </div>
		</body>
		</html>
	`, userName, eventName, eventDate, eventLocation)

	m.SetBody("text/html", body)

	port, err := strconv.Atoi(smtpPortStr)
	if err != nil {
		log.Printf("SMTP port invalid: %v\n", err)
		return
	}

	d := gomail.NewDialer(smtpHost, port, smtpEmail, smtpPassword)

	if err := d.DialAndSend(m); err != nil {
		log.Printf("Gagal mengirim email ke %s: %v\n", toEmail, err)
		return
	}

	log.Printf("Email konfirmasi dikirim ke %s\n", toEmail)
}

// SendVerificationEmail mengirimkan email kode verifikasi untuk registrasi
func SendVerificationEmail(toEmail string, verificationCode string) error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("panic recovered in SendVerificationEmail: %v", r)
		}
	}()

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	if smtpHost == "" || smtpPortStr == "" || smtpEmail == "" || smtpPassword == "" {
		return fmt.Errorf("SMTP config belum lengkap")
	}

	m := gomail.NewMessage()
	m.SetHeader("From", smtpEmail)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Kode Verifikasi Email - Nexus Event")

	body := fmt.Sprintf(`
		<!doctype html>
		<html>
		<head>
		  <meta charset="UTF-8">
		</head>
		<body style="font-family: Arial, sans-serif; background:#f6f9fc; padding:20px;">
		  <div style="max-width:520px; margin:0 auto; background:white; padding:20px 24px; border-radius:12px; border:1px solid #e5e7eb;">
			<h2 style="margin-top:0; color:#111827;">Kode Verifikasi Email</h2>
			<p style="color:#374151;">Terima kasih telah mendaftar di Nexus Event. Gunakan kode verifikasi berikut untuk menyelesaikan pendaftaran Anda:</p>
			<div style="background:#f3f4f6; padding:20px; border-radius:10px; margin:20px 0; text-align:center;">
			  <h1 style="margin:0; color:#1d4ed8; font-size:32px; letter-spacing:8px; font-family:monospace;">%s</h1>
			</div>
			<p style="color:#374151;">Kode verifikasi ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.</p>
			<p style="color:#6b7280; font-size:12px; margin-top:24px;">Jika Anda tidak melakukan pendaftaran, abaikan email ini.</p>
			<p style="color:#6b7280; font-size:12px;">Email ini dikirim otomatis, mohon tidak membalas.</p>
		  </div>
		</body>
		</html>
	`, verificationCode)

	m.SetBody("text/html", body)

	port, err := strconv.Atoi(smtpPortStr)
	if err != nil {
		return fmt.Errorf("SMTP port invalid: %v", err)
	}

	d := gomail.NewDialer(smtpHost, port, smtpEmail, smtpPassword)

	if err := d.DialAndSend(m); err != nil {
		log.Printf("Gagal mengirim email verifikasi ke %s: %v\n", toEmail, err)
		return err
	}

	log.Printf("Email verifikasi dikirim ke %s\n", toEmail)
	return nil
}

// SendCertificateEmail mengirimkan email sertifikat dengan attachment
func SendCertificateEmail(toEmail string, userName string, eventName string, eventDate string, certificateURL string) error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("panic recovered in SendCertificateEmail: %v", r)
		}
	}()

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	if smtpHost == "" || smtpPortStr == "" || smtpEmail == "" || smtpPassword == "" {
		return fmt.Errorf("SMTP config belum lengkap")
	}

	m := gomail.NewMessage()
	m.SetHeader("From", smtpEmail)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", fmt.Sprintf("Sertifikat Event: %s", eventName))

	body := fmt.Sprintf(`
		<!doctype html>
		<html>
		<head>
		  <meta charset="UTF-8">
		</head>
		<body style="font-family: Arial, sans-serif; background:#f6f9fc; padding:20px;">
		  <div style="max-width:520px; margin:0 auto; background:white; padding:20px 24px; border-radius:12px; border:1px solid #e5e7eb;">
			<h2 style="margin-top:0; color:#111827;">Selamat %s!</h2>
			<p style="color:#374151;">Terima kasih telah mengikuti event <strong>%s</strong> yang diselenggarakan pada <strong>%s</strong>.</p>
			<p style="color:#374151;">Kami dengan bangga mengirimkan sertifikat Anda sebagai bentuk apresiasi atas partisipasi Anda di event ini.</p>
			<div style="background:#f3f4f6; padding:12px 14px; border-radius:10px; margin:16px 0;">
			  <p style="margin:4px 0; color:#111827;"><strong>Event:</strong> %s</p>
			  <p style="margin:4px 0; color:#111827;"><strong>Tanggal:</strong> %s</p>
			</div>
			<p style="color:#374151;">Sertifikat Anda dapat diunduh melalui link di bawah ini atau melalui attachment email ini.</p>
			<div style="margin:24px 0; text-align:center;">
			  <a href="%s" style="display:inline-block; background:#1d4ed8; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold;">Download Sertifikat</a>
			</div>
			<p style="color:#374151;">Semoga sertifikat ini dapat menjadi bukti partisipasi dan kontribusi Anda dalam event ini.</p>
			<p style="color:#6b7280; font-size:12px; margin-top:24px;">Email ini dikirim otomatis, mohon tidak membalas.</p>
		  </div>
		</body>
		</html>
	`, userName, eventName, eventDate, eventName, eventDate, certificateURL)

	m.SetBody("text/html", body)

	// Attach certificate jika certificateURL adalah path file lokal
	if certificateURL != "" {
		// Extract filename dari URL (misal: http://localhost:8000/public/certificates/rofi2425@gmail.com.pdf)
		filename := certificateURL
		if strings.HasPrefix(certificateURL, "http://localhost:8000/public/certificates/") {
			filename = strings.TrimPrefix(certificateURL, "http://localhost:8000/public/certificates/")
		}
		filePath := fmt.Sprintf("public/certificates/%s", filename)
		
		// Cek apakah file ada sebelum attach
		if _, err := os.Stat(filePath); err == nil {
			m.Attach(filePath)
		} else {
			log.Printf("File sertifikat tidak ditemukan di %s, email tetap dikirim tanpa attachment\n", filePath)
		}
	}

	port, err := strconv.Atoi(smtpPortStr)
	if err != nil {
		return fmt.Errorf("SMTP port invalid: %v", err)
	}

	d := gomail.NewDialer(smtpHost, port, smtpEmail, smtpPassword)

	if err := d.DialAndSend(m); err != nil {
		log.Printf("Gagal mengirim email sertifikat ke %s: %v\n", toEmail, err)
		return err
	}

	log.Printf("Email sertifikat dikirim ke %s\n", toEmail)
	return nil
}