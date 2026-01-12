package controllers

import (
	"fmt"
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type DashboardStats struct {
	TotalEvents        int64   `json:"total_events"`
	ActiveEvents      int64   `json:"active_events"`
	TotalParticipants  int64   `json:"total_participants"`
	TotalBudgetPlan   float64 `json:"total_budget_plan"`
	TotalBudgetReal   float64 `json:"total_budget_real"`
	PendingApprovals  int64   `json:"pending_approvals"`
	// User-specific stats
	UserTasksCompleted int64   `json:"user_tasks_completed"`
	UserTasksTotal     int64   `json:"user_tasks_total"`
	UserTeamMembers    int64   `json:"user_team_members"`
	UserActiveTeamMembers int64 `json:"user_active_team_members"`
	OverallProgress    float64 `json:"overall_progress"`
	TasksInProgress    int64   `json:"tasks_in_progress"`
	DailyRegistrations []struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
	} `json:"daily_registrations"`
	FacultyDistribution []struct {
		Name  string `json:"name"`
		Value int64  `json:"value"`
	} `json:"faculty_distribution"`
}

// GET /api/dashboard/stats
func GetDashboardStats(c *gin.Context) {
	var stats DashboardStats

	// Ambil User ID dari Token
	userIDInterface, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
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

	// 1. Total Events (semua event)
	database.DB.Model(&models.Event{}).Count(&stats.TotalEvents)

	// 1a. Active Events (event yang user ikuti sebagai panitia yang masih aktif dan bukan "done")
	now := time.Now()
	var activeEventIDs []uint
	database.DB.Model(&models.CommitteeMember{}).
		Joins("INNER JOIN events ON committee_members.event_id = events.id").
		Where("committee_members.user_id = ? AND events.status != ? AND (events.status = ? OR (events.start_date <= ? AND events.end_date >= ?))",
			userID, "done", "published", now, now).
		Pluck("DISTINCT events.id", &activeEventIDs)
	stats.ActiveEvents = int64(len(activeEventIDs))
	
	// Debug
	fmt.Printf("=== DEBUG ACTIVE EVENTS FOR USER %d ===\n", userID)
	fmt.Printf("Active Event IDs: %v\n", activeEventIDs)
	fmt.Printf("Active Events Count: %d\n", stats.ActiveEvents)

	// 2. Total Participants (semua registrations)
	database.DB.Model(&models.Registration{}).Count(&stats.TotalParticipants)

	// 3. Total Budget Plan (Sum plan_amount dari budgets)
	var totalPlan float64
	database.DB.Model(&models.Budget{}).Select("COALESCE(SUM(plan_amount), 0)").Scan(&totalPlan)
	stats.TotalBudgetPlan = totalPlan

	// 4. Total Budget Real (Sum real_amount dari budgets)
	var totalReal float64
	database.DB.Model(&models.Budget{}).Select("COALESCE(SUM(real_amount), 0)").Scan(&totalReal)
	stats.TotalBudgetReal = totalReal

	// 5. Pending Approvals (registrations dengan status "pending")
	database.DB.Model(&models.Registration{}).
		Where("status = ?", "pending").
		Count(&stats.PendingApprovals)

	// 4. Daily Registrations (30 hari terakhir)
	// Normalize ke awal hari ini (00:00:00)
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	// Ambil data mulai dari 30 hari yang lalu (termasuk hari ini)
	thirtyDaysAgo := startOfToday.AddDate(0, 0, -29) // -29 karena hari ini juga dihitung
	// Akhir query sampai akhir hari ini (23:59:59)
	endOfToday := startOfToday.AddDate(0, 0, 1).Add(-time.Second)

	// Query untuk mendapatkan registrations per hari dalam 30 hari terakhir
	type DailyCount struct {
		Date  string `gorm:"column:date"`
		Count int64  `gorm:"column:count"`
	}

	var dailyCounts []DailyCount
	query := `
		SELECT DATE_FORMAT(DATE(created_at), '%Y-%m-%d') as date, COUNT(*) as count 
		FROM registrations 
		WHERE created_at >= ? AND created_at <= ?
		GROUP BY DATE(created_at) 
		ORDER BY date ASC
	`
	database.DB.Raw(query, thirtyDaysAgo, endOfToday).Scan(&dailyCounts)

	// Debug: Print query parameters
	fmt.Printf("Query params - From: %v, To: %v\n", thirtyDaysAgo, endOfToday)
	fmt.Printf("Daily counts result: %+v\n", dailyCounts)

	// Convert ke format yang diinginkan
	stats.DailyRegistrations = make([]struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
	}, 0)

	// Buat map untuk memudahkan pencarian
	dailyMap := make(map[string]int)
	for _, dc := range dailyCounts {
		dailyMap[dc.Date] = int(dc.Count)
	}

	// Generate semua tanggal dalam 30 hari terakhir (termasuk hari ini) dan isi dengan count
	currentDate := thirtyDaysAgo
	for i := 0; i < 30; i++ {
		dateStr := currentDate.Format("2006-01-02")
		count := dailyMap[dateStr]
		stats.DailyRegistrations = append(stats.DailyRegistrations, struct {
			Date  string `json:"date"`
			Count int    `json:"count"`
		}{
			Date:  dateStr,
			Count: count,
		})
		currentDate = currentDate.AddDate(0, 0, 1)
	}

	// 7. User-specific stats
	// Tasks user (completed/total) - HANYA dari event yang aktif yang user ikuti sebagai panitia
	// Menggunakan kondisi yang sama dengan Active Events: status != "done" dan (published atau dalam range tanggal)
	var allTasks []models.Task
	database.DB.
		Joins("INNER JOIN events ON tasks.event_id = events.id").
		Joins("INNER JOIN committee_members ON events.id = committee_members.event_id").
		Where("tasks.assigned_to_id = ? AND committee_members.user_id = ? AND events.status != ? AND (events.status = ? OR (events.start_date <= ? AND events.end_date >= ?))", 
			userID, userID, "done", "published", now, now).
		Find(&allTasks)
	stats.UserTasksTotal = int64(len(allTasks))
	
	// Count completed tasks (status = "done") - HANYA dari event yang aktif yang user ikuti sebagai panitia
	var completedTasks []models.Task
	database.DB.
		Joins("INNER JOIN events ON tasks.event_id = events.id").
		Joins("INNER JOIN committee_members ON events.id = committee_members.event_id").
		Where("tasks.assigned_to_id = ? AND tasks.status = ? AND committee_members.user_id = ? AND events.status != ? AND (events.status = ? OR (events.start_date <= ? AND events.end_date >= ?))", 
			userID, "done", userID, "done", "published", now, now).
		Find(&completedTasks)
	stats.UserTasksCompleted = int64(len(completedTasks))
	
	// Debug: Print all tasks untuk user ini
	fmt.Printf("=== DEBUG TASKS FOR USER %d (ONLY FROM ACTIVE EVENTS USER IS COMMITTEE) ===\n", userID)
	for _, task := range allTasks {
		fmt.Printf("Task ID: %d, Title: %s, Status: %s, EventID: %v, AssignedToID: %v\n", 
			task.ID, task.Title, task.Status, task.EventID, task.AssignedToID)
	}
	fmt.Printf("Total Tasks: %d, Completed: %d\n", stats.UserTasksTotal, stats.UserTasksCompleted)

	// Tasks in progress - HANYA dari event yang aktif yang user ikuti sebagai panitia
	database.DB.Model(&models.Task{}).
		Joins("INNER JOIN events ON tasks.event_id = events.id").
		Joins("INNER JOIN committee_members ON events.id = committee_members.event_id").
		Where("tasks.assigned_to_id = ? AND tasks.status = ? AND committee_members.user_id = ? AND events.status != ? AND (events.status = ? OR (events.start_date <= ? AND events.end_date >= ?))", 
			userID, "in-progress", userID, "done", "published", now, now).
		Count(&stats.TasksInProgress)

	// Team Members (jumlah event yang aktif yang user ikuti sebagai panitia)
	// Menggunakan kondisi yang sama dengan Active Events
	var committees []models.CommitteeMember
	database.DB.Joins("INNER JOIN events ON committee_members.event_id = events.id").
		Where("committee_members.user_id = ? AND events.status != ? AND (events.status = ? OR (events.start_date <= ? AND events.end_date >= ?))",
			userID, "done", "published", now, now).
		Find(&committees)
	stats.UserTeamMembers = int64(len(committees))
	
	// Debug: Print all committees untuk user ini
	fmt.Printf("=== DEBUG COMMITTEES FOR USER %d (ONLY FROM ACTIVE EVENTS) ===\n", userID)
	for _, cm := range committees {
		fmt.Printf("Committee ID: %d, EventID: %d, UserID: %d\n", 
			cm.ID, cm.EventID, cm.UserID)
	}
	fmt.Printf("Total Team Members: %d\n", stats.UserTeamMembers)

	// Active Team Members (sama dengan UserTeamMembers karena sudah filter active)
	stats.UserActiveTeamMembers = stats.UserTeamMembers

	// Debug logging
	fmt.Printf("Dashboard Stats for User ID: %d\n", userID)
	fmt.Printf("Total Events: %d\n", stats.TotalEvents)
	fmt.Printf("Active Events: %d\n", stats.ActiveEvents)
	fmt.Printf("User Tasks Total: %d\n", stats.UserTasksTotal)
	fmt.Printf("User Tasks Completed: %d\n", stats.UserTasksCompleted)
	fmt.Printf("User Team Members: %d\n", stats.UserTeamMembers)
	fmt.Printf("User Active Team Members: %d\n", stats.UserActiveTeamMembers)

	// Overall Progress (persentase tasks completed)
	if stats.UserTasksTotal > 0 {
		stats.OverallProgress = float64(stats.UserTasksCompleted) / float64(stats.UserTasksTotal) * 100
	} else {
		stats.OverallProgress = 0
	}

	// 8. Task Status Distribution (Sebaran Status Task untuk user yang login)
	// Hanya 4 status yang valid: todo, in-progress, review, done
	// HANYA dari event yang aktif yang user ikuti sebagai panitia
	// Menggunakan kondisi yang sama dengan Active Events
	var tasks []models.Task
	database.DB.
		Joins("INNER JOIN events ON tasks.event_id = events.id").
		Joins("INNER JOIN committee_members ON events.id = committee_members.event_id").
		Where("tasks.assigned_to_id = ? AND committee_members.user_id = ? AND events.status != ? AND (events.status = ? OR (events.start_date <= ? AND events.end_date >= ?))", 
			userID, userID, "done", "published", now, now).
		Find(&tasks)

	// Map status untuk label yang lebih user-friendly (hanya 4 status)
	statusLabels := map[string]string{
		"todo":        "To Do",
		"in-progress": "In Progress",
		"review":      "Review",
		"done":        "Completed",
	}
	
	// Hitung per status dengan normalisasi yang lebih ketat
	statusCounts := make(map[string]int64)
	for _, task := range tasks {
		// Normalisasi status: trim whitespace, lowercase, dan handle empty
		status := strings.TrimSpace(strings.ToLower(task.Status))
		if status == "" {
			status = "todo"
		}
		
		// Normalisasi variasi status yang mungkin ada
		switch status {
		case "todo", "to-do", "to_do":
			status = "todo"
		case "in-progress", "inprogress", "in_progress", "in progress":
			status = "in-progress"
		case "review":
			status = "review"
		case "done", "completed", "complete":
			status = "done"
		default:
			// Jika status tidak valid, default ke 'todo' dan log untuk debugging
			fmt.Printf("WARNING: Task ID %d has invalid status '%s', normalizing to 'todo'\n", task.ID, task.Status)
			status = "todo"
		}
		
		// Hanya hitung status yang valid (seharusnya semua sudah dinormalisasi)
		if _, exists := statusLabels[status]; exists {
			statusCounts[status]++
		}
	}

	// Convert ke format yang diinginkan dengan urutan yang konsisten
	stats.FacultyDistribution = make([]struct {
		Name  string `json:"name"`
		Value int64  `json:"value"`
	}, 0)
	
	// Urutan untuk display
	statusOrder := []string{"todo", "in-progress", "review", "done"}
	
	// Build response dengan urutan yang konsisten (hanya 4 status)
	for _, statusKey := range statusOrder {
		count := statusCounts[statusKey]
		label := statusLabels[statusKey]
		stats.FacultyDistribution = append(stats.FacultyDistribution, struct {
			Name  string `json:"name"`
			Value int64  `json:"value"`
		}{
			Name:  label,
			Value: count,
		})
	}
	
	// Debug: Print hasil untuk troubleshooting
	fmt.Printf("=== TASK STATUS DISTRIBUTION FOR USER %d ===\n", userID)
	fmt.Printf("Total tasks found: %d\n", len(tasks))
	for _, task := range tasks {
		fmt.Printf("  Task ID: %d, Status (raw): '%s', Status (normalized): '%s'\n", 
			task.ID, task.Status, strings.TrimSpace(strings.ToLower(task.Status)))
	}
	for _, statusKey := range statusOrder {
		fmt.Printf("  %s (%s): %d\n", statusKey, statusLabels[statusKey], statusCounts[statusKey])
	}
	fmt.Printf("FacultyDistribution array length: %d\n", len(stats.FacultyDistribution))
	for i, item := range stats.FacultyDistribution {
		fmt.Printf("  [%d] Name: '%s', Value: %d\n", i, item.Name, item.Value)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Dashboard statistics",
		"data":    stats,
	})
}
