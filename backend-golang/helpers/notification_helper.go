package helpers

import (
	"fmt"
	"log"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/models"
)

// GetCommitteeUserIDs mendapatkan list user ID panitia dari suatu event
func GetCommitteeUserIDs(eventID uint) []uint {
	var members []models.CommitteeMember
	database.DB.Where("event_id = ?", eventID).Find(&members)

	var userIDs []uint
	for _, m := range members {
		userIDs = append(userIDs, m.UserID)
	}
	return userIDs
}

// CreateNotification membuat notifikasi baru
func CreateNotification(userID uint, notifType models.NotificationType, title, message string, entityType string, entityID uint, actionURL string) error {
	notification := models.Notification{
		UserID:     userID,
		Type:       notifType,
		Title:      title,
		Message:    message,
		EntityType: entityType,
		EntityID:   entityID,
		ActionURL:  actionURL,
		IsRead:     false,
	}

	if err := database.DB.Create(&notification).Error; err != nil {
		log.Printf("Error creating notification: %v", err)
		return err
	}
	return nil
}

// CreateNotificationBulk membuat notifikasi untuk banyak user sekaligus
func CreateNotificationBulk(userIDs []uint, notifType models.NotificationType, title, message string, entityType string, entityID uint, actionURL string) error {
	var notifications []models.Notification
	for _, userID := range userIDs {
		notifications = append(notifications, models.Notification{
			UserID:     userID,
			Type:       notifType,
			Title:      title,
			Message:    message,
			EntityType: entityType,
			EntityID:   entityID,
			ActionURL:  actionURL,
			IsRead:     false,
		})
	}

	if len(notifications) > 0 {
		if err := database.DB.Create(&notifications).Error; err != nil {
			log.Printf("Error creating bulk notifications: %v", err)
			return err
		}
	}
	return nil
}

// ========== NOTIFIKASI UNTUK PESERTA ==========

// NotifyRegistrationSubmitted - Notifikasi pendaftaran berhasil diajukan
func NotifyRegistrationSubmitted(userID uint, eventTitle string, eventSlug string) {
	CreateNotification(
		userID,
		models.NotifRegistrationSubmitted,
		"Pendaftaran Diajukan",
		fmt.Sprintf("Pendaftaran Anda untuk \"%s\" berhasil diajukan. Silakan tunggu konfirmasi dari panitia.", eventTitle),
		"event",
		0,
		fmt.Sprintf("/event/%s", eventSlug),
	)
}

// NotifyRegistrationApproved - Notifikasi pendaftaran disetujui
func NotifyRegistrationApproved(userID uint, eventTitle string, eventSlug string) {
	CreateNotification(
		userID,
		models.NotifRegistrationApproved,
		"Pendaftaran Disetujui ✅",
		fmt.Sprintf("Selamat! Pendaftaran Anda untuk \"%s\" telah disetujui. Lihat tiket Anda di halaman Tiket Saya.", eventTitle),
		"event",
		0,
		"/my-tickets",
	)
}

// NotifyRegistrationRejected - Notifikasi pendaftaran ditolak
func NotifyRegistrationRejected(userID uint, eventTitle string, reason string) {
	message := fmt.Sprintf("Maaf, pendaftaran Anda untuk \"%s\" tidak dapat disetujui.", eventTitle)
	if reason != "" {
		message += fmt.Sprintf(" Alasan: %s", reason)
	}
	CreateNotification(
		userID,
		models.NotifRegistrationRejected,
		"Pendaftaran Ditolak",
		message,
		"event",
		0,
		"/my-tickets",
	)
}

// NotifyEventReminder - Reminder H-1 event
func NotifyEventReminder(userID uint, eventTitle string, eventSlug string, eventDate string) {
	CreateNotification(
		userID,
		models.NotifEventReminder,
		"Reminder: Event Besok! 📅",
		fmt.Sprintf("Jangan lupa! Event \"%s\" akan dimulai besok (%s). Pastikan Anda siap!", eventTitle, eventDate),
		"event",
		0,
		fmt.Sprintf("/event/%s", eventSlug),
	)
}

// NotifyCertificateReady - Notifikasi sertifikat siap
func NotifyCertificateReady(userID uint, eventTitle string, eventSlug string) {
	CreateNotification(
		userID,
		models.NotifCertificateReady,
		"Sertifikat Tersedia 🎓",
		fmt.Sprintf("Sertifikat Anda untuk \"%s\" sudah tersedia. Download sekarang di halaman Tiket Saya.", eventTitle),
		"event",
		0,
		"/my-tickets",
	)
}

// NotifyPaymentSuccess - Notifikasi pembayaran berhasil
func NotifyPaymentSuccess(userID uint, eventTitle string, eventSlug string) {
	CreateNotification(
		userID,
		models.NotifPaymentSuccess,
		"Pembayaran Berhasil 💳",
		fmt.Sprintf("Pembayaran untuk \"%s\" telah dikonfirmasi. Terima kasih!", eventTitle),
		"event",
		0,
		"/my-tickets",
	)
}

// NotifyPaymentPending - Notifikasi menunggu pembayaran
func NotifyPaymentPending(userID uint, eventTitle string, eventSlug string) {
	CreateNotification(
		userID,
		models.NotifPaymentPending,
		"Menunggu Pembayaran 💳",
		fmt.Sprintf("Pendaftaran \"%s\" menunggu pembayaran. Segera lakukan pembayaran untuk mengonfirmasi pendaftaran Anda.", eventTitle),
		"event",
		0,
		fmt.Sprintf("/event/%s", eventSlug),
	)
}

// ========== NOTIFIKASI UNTUK PANITIA ==========

// NotifyNewRegistration - Notifikasi ada pendaftar baru (ke semua panitia event)
func NotifyNewRegistration(eventID uint, eventTitle string, participantName string) {
	committeeUserIDs := GetCommitteeUserIDs(eventID)
	if len(committeeUserIDs) == 0 {
		return
	}

	var event models.Event
	database.DB.First(&event, eventID)

	CreateNotificationBulk(
		committeeUserIDs,
		models.NotifNewRegistration,
		"Pendaftar Baru 👤",
		fmt.Sprintf("%s mendaftar untuk event \"%s\".", participantName, eventTitle),
		"event",
		eventID,
		fmt.Sprintf("/dashboard/event/%s", event.Slug),
	)
}

// NotifyTaskAssigned - Notifikasi ditugaskan task
func NotifyTaskAssigned(userID uint, taskTitle string, eventTitle string, eventSlug string) {
	CreateNotification(
		userID,
		models.NotifTaskAssigned,
		"Tugas Baru 📋",
		fmt.Sprintf("Anda ditugaskan: \"%s\" untuk event \"%s\".", taskTitle, eventTitle),
		"task",
		0,
		fmt.Sprintf("/dashboard/event/%s", eventSlug),
	)
}

// NotifyTaskDeadline - Notifikasi deadline tugas
func NotifyTaskDeadline(userID uint, taskTitle string, deadline string, eventSlug string) {
	CreateNotification(
		userID,
		models.NotifTaskDeadline,
		"Deadline Mendekat ⏰",
		fmt.Sprintf("Tugas \"%s\" deadline: %s. Segera selesaikan!", taskTitle, deadline),
		"task",
		0,
		fmt.Sprintf("/dashboard/event/%s", eventSlug),
	)
}

// NotifyTaskCompleted - Notifikasi task selesai (untuk koordinator)
func NotifyTaskCompleted(coordinatorUserID uint, taskTitle string, eventTitle string, eventSlug string, assigneeName string) {
	CreateNotification(
		coordinatorUserID,
		models.NotifTaskCompleted,
		"Tugas Selesai ✅",
		fmt.Sprintf("%s telah menyelesaikan tugas \"%s\" untuk event \"%s\".", assigneeName, taskTitle, eventTitle),
		"task",
		0,
		fmt.Sprintf("/dashboard/event/%s", eventSlug),
	)
}

// NotifyLoanRequest - Notifikasi request peminjaman baru
func NotifyLoanRequest(logistikUserIDs []uint, requesterName string, eventTitle string, loanID uint) {
	CreateNotificationBulk(
		logistikUserIDs,
		models.NotifLoanRequest,
		"Request Peminjaman Baru 📦",
		fmt.Sprintf("%s mengajukan peminjaman barang untuk event \"%s\".", requesterName, eventTitle),
		"loan",
		loanID,
		"/logistics/loans",
	)
}

// NotifyLoanApproved - Notifikasi peminjaman disetujui (ke semua panitia event)
func NotifyLoanApproved(eventID uint, eventTitle string, eventSlug string) {
	committeeUserIDs := GetCommitteeUserIDs(eventID)
	if len(committeeUserIDs) == 0 {
		return
	}

	CreateNotificationBulk(
		committeeUserIDs,
		models.NotifLoanApproved,
		"Peminjaman Disetujui ✅",
		fmt.Sprintf("Request peminjaman untuk event \"%s\" telah disetujui.", eventTitle),
		"event",
		eventID,
		fmt.Sprintf("/dashboard/event/%s", eventSlug),
	)
}

// NotifyLoanRejected - Notifikasi peminjaman ditolak (ke semua panitia event)
func NotifyLoanRejected(eventID uint, eventTitle string, eventSlug string) {
	committeeUserIDs := GetCommitteeUserIDs(eventID)
	if len(committeeUserIDs) == 0 {
		return
	}

	CreateNotificationBulk(
		committeeUserIDs,
		models.NotifLoanRejected,
		"Peminjaman Ditolak",
		fmt.Sprintf("Request peminjaman untuk event \"%s\" ditolak.", eventTitle),
		"event",
		eventID,
		fmt.Sprintf("/dashboard/event/%s", eventSlug),
	)
}

// NotifyCommitteeAdded - Notifikasi ditambahkan sebagai panitia
func NotifyCommitteeAdded(userID uint, eventTitle string, position string, eventSlug string) {
	CreateNotification(
		userID,
		models.NotifCommitteeAdded,
		"Ditambahkan sebagai Panitia 🎉",
		fmt.Sprintf("Anda ditambahkan sebagai panitia \"%s\" untuk event \"%s\".", position, eventTitle),
		"event",
		0,
		fmt.Sprintf("/dashboard/event/%s", eventSlug),
	)
}

// NotifyEventPublished - Notifikasi event dipublish (ke semua panitia event)
func NotifyEventPublished(eventID uint, eventTitle string, eventSlug string) {
	committeeUserIDs := GetCommitteeUserIDs(eventID)
	if len(committeeUserIDs) == 0 {
		return
	}

	CreateNotificationBulk(
		committeeUserIDs,
		models.NotifEventPublished,
		"Event Dipublikasikan 🚀",
		fmt.Sprintf("Event \"%s\" telah dipublikasikan dan terbuka untuk pendaftaran.", eventTitle),
		"event",
		eventID,
		fmt.Sprintf("/dashboard/event/%s", eventSlug),
	)
}
