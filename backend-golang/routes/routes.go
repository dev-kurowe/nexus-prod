package routes

import (
	"santrikoding/backend-api/controllers"
	"santrikoding/backend-api/middlewares"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {

	//initialize gin
	router := gin.Default()
	router.Static("/public", "./public")

	// set up CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:  []string{"*"},
		AllowMethods:  []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:  []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders: []string{"Content-Length"},
	}))

	// route register with email verification
	router.POST("/api/register/send-verification", controllers.SendVerificationCode)
	router.POST("/api/register/verify", controllers.VerifyAndRegister)

	// Public routes for registration (no auth required)
	router.GET("/api/public/universities", controllers.GetUniversities)
	router.GET("/api/public/faculties", controllers.GetFaculties)
	router.GET("/api/public/study-programs", controllers.GetStudyPrograms)

	// route login
	router.POST("/api/login", controllers.Login)

	// route users
	router.GET("/api/users", middlewares.AuthMiddleware(), controllers.FindUsers)
	router.GET("/api/users/search", middlewares.AuthMiddleware(), controllers.SearchUsers) // Search users for autocomplete

	// route user create
	router.POST("/api/users", middlewares.AuthMiddleware(), controllers.CreateUser)

	// route user by id
	router.GET("/api/users/:id", middlewares.AuthMiddleware(), controllers.FindUserById)

	// route user update
	router.PUT("/api/users/:id", middlewares.AuthMiddleware(), controllers.UpdateUser)

	// route user delete
	router.DELETE("/api/users/:id", middlewares.AuthMiddleware(), controllers.DeleteUser)

	// user self-service
	router.PUT("/api/user/profile", middlewares.AuthMiddleware(), controllers.UpdateProfile)
	router.PUT("/api/user/avatar", middlewares.AuthMiddleware(), controllers.UpdateAvatar)
	router.DELETE("/api/user/avatar", middlewares.AuthMiddleware(), controllers.DeleteAvatar)
	router.PUT("/api/user/password", middlewares.AuthMiddleware(), controllers.ChangePassword)

	// route dashboard
	router.GET("/api/dashboard/stats", middlewares.AuthMiddleware(), controllers.GetDashboardStats)

	// route events
	router.GET("/api/events", controllers.FindEvents)
	router.POST("/api/events", middlewares.AuthMiddleware(), controllers.CreateEvent)
	// Routes yang spesifik dengan path berbeda harus diletakkan SEBELUM route yang general (:id)
	router.GET("/api/events/completed", middlewares.AuthMiddleware(), controllers.GetCompletedEvents)
	router.PUT("/api/events/:id/complete", middlewares.AuthMiddleware(), controllers.CompleteEvent)
	router.PUT("/api/events/:id/publish", middlewares.AuthMiddleware(), controllers.PublishEvent)
	router.GET("/api/events/:id/report", middlewares.AuthMiddleware(), controllers.GetEventReport)
	router.GET("/api/events/:id/performance", middlewares.AuthMiddleware(), controllers.GetEventPerformance)
	router.PUT("/api/events/:id", middlewares.AuthMiddleware(), controllers.UpdateEvent)
	router.DELETE("/api/events/:id", middlewares.AuthMiddleware(), controllers.DeleteEvent)
	// Route slug dengan path berbeda untuk menghindari konflik dengan :id
	router.GET("/api/events/slug/:slug", controllers.FindEventBySlug)

	router.GET("/api/forms/event/:id", controllers.GetFormSchema)
	router.POST("/api/forms/event/:id", middlewares.AuthMiddleware(), controllers.CreateFormField)
	router.DELETE("/api/form-fields/:id", middlewares.AuthMiddleware(), controllers.DeleteFormField)

	//route registration
	router.POST("/api/participant/event/:id/register", middlewares.AuthMiddleware(), controllers.RegisterEvent)
	router.GET("/api/participants/event/:id", middlewares.AuthMiddleware(), controllers.GetParticipants)
	router.GET("/api/user/registrations", middlewares.AuthMiddleware(), controllers.GetUserRegistrations)
	router.GET("/api/registration-status/event/:id", middlewares.AuthMiddleware(), controllers.GetRegistrationStatus)
	router.POST("/api/scan/check-in", middlewares.AuthMiddleware(), controllers.VerifyCheckIn) // Scan QR Code (Event Offline)
	router.POST("/api/check-in/self", middlewares.AuthMiddleware(), controllers.SelfCheckIn)   // Self Check-in (Event Online)
	router.PUT("/api/participants/:id/status", middlewares.AuthMiddleware(), controllers.UpdateRegistrationStatus)
	router.PUT("/api/participants/:id/attendance", middlewares.AuthMiddleware(), controllers.UpdateAttendance) // Manual Update Attendance (Panitia)
	router.POST("/api/participants/bulk-update-status", middlewares.AuthMiddleware(), controllers.BulkUpdateRegistrationStatus)
	router.GET("/api/export/event/:id/participants", middlewares.AuthMiddleware(), controllers.ExportEventParticipants)

	//route certificates
	router.POST("/api/certificates/registration/:registration_id/upload", middlewares.AuthMiddleware(), controllers.UploadCertificate)
	router.POST("/api/certificates/event/:event_id/upload-bulk", middlewares.AuthMiddleware(), controllers.UploadCertificatesBulk) // Bulk upload berdasarkan email
	router.POST("/api/certificates/registration/:registration_id/send-email", middlewares.AuthMiddleware(), controllers.SendCertificateEmail)
	router.POST("/api/certificates/event/:event_id/send-email-bulk", middlewares.AuthMiddleware(), controllers.SendCertificatesEmailBulk)
	router.GET("/api/certificates/registration/:registration_id/download", controllers.DownloadCertificate)
	router.GET("/api/certificates/validate/:code", controllers.GetCertificateByCode)

	//route payment
	router.POST("/api/payment/initiate/:id", middlewares.AuthMiddleware(), controllers.InitiatePayment)
	router.POST("/api/payment/notification", controllers.HandleNotification)                            // Public untuk webhook
	router.GET("/api/payment/status/:id", middlewares.AuthMiddleware(), controllers.CheckPaymentStatus) // Check payment status

	//route committees
	router.GET("/api/committees/event/:event_id", middlewares.AuthMiddleware(), controllers.GetCommitteeMembers)
	router.POST("/api/committees/event/:event_id", middlewares.AuthMiddleware(), controllers.AddCommitteeMember)
	router.DELETE("/api/committees/:member_id", middlewares.AuthMiddleware(), controllers.RemoveCommitteeMember)
	router.GET("/api/user/committee-status", middlewares.AuthMiddleware(), controllers.GetUserCommitteeStatus) // Cek status panitia untuk mahasiswa

	//route tasks
	router.GET("/api/tasks/event/:event_id", middlewares.AuthMiddleware(), controllers.GetTasks)
	router.GET("/api/tasks/my-tasks", middlewares.AuthMiddleware(), controllers.GetUserTasks)
	router.POST("/api/tasks/event/:event_id", middlewares.AuthMiddleware(), controllers.CreateTask)
	router.PUT("/api/tasks/:task_id", middlewares.AuthMiddleware(), controllers.UpdateTask)
	router.DELETE("/api/tasks/:task_id", middlewares.AuthMiddleware(), controllers.DeleteTask)
	router.POST("/api/tasks/:task_id/upload-proof", middlewares.AuthMiddleware(), controllers.UploadProof)
	router.PUT("/api/tasks/:task_id/comments", middlewares.AuthMiddleware(), controllers.UpdateComments)

	//route budgets (avoid conflict with :slug)
	router.GET("/api/budgets/event/:event_id", middlewares.AuthMiddleware(), controllers.GetBudgets)
	router.POST("/api/budgets/event/:event_id", middlewares.AuthMiddleware(), controllers.CreateBudget)
	router.PUT("/api/budgets/:id", middlewares.AuthMiddleware(), controllers.UpdateBudget)
	router.DELETE("/api/budgets/:id", middlewares.AuthMiddleware(), controllers.DeleteBudget)

	//route inventory
	router.GET("/api/inventory", middlewares.AuthMiddleware(), controllers.GetItems)
	router.POST("/api/inventory", middlewares.AuthMiddleware(), controllers.CreateItem)
	router.PUT("/api/inventory/:id", middlewares.AuthMiddleware(), controllers.UpdateItem)
	router.DELETE("/api/inventory/:id", middlewares.AuthMiddleware(), controllers.DeleteItem)

	//route loans (avoid conflict with :slug)
	router.POST("/api/loans/event/:event_id", middlewares.AuthMiddleware(), controllers.RequestLoan)
	router.GET("/api/loans/event/:event_id", middlewares.AuthMiddleware(), controllers.GetEventLoan)
	router.GET("/api/loans", middlewares.AuthMiddleware(), controllers.GetAllLoans)
	router.POST("/api/loans/:id/approve", middlewares.AuthMiddleware(), controllers.ApproveLoan)
	router.POST("/api/loans/:id/reject", middlewares.AuthMiddleware(), controllers.RejectLoan)
	router.POST("/api/loans/:id/return", middlewares.AuthMiddleware(), controllers.ReturnLoan)

	//route activities
	router.GET("/api/activities/recent", middlewares.AuthMiddleware(), controllers.GetRecentActivities)

	//route notifications
	router.GET("/api/notifications", middlewares.AuthMiddleware(), controllers.GetNotifications)
	router.GET("/api/notifications/unread-count", middlewares.AuthMiddleware(), controllers.GetUnreadCount)
	router.PUT("/api/notifications/:id/read", middlewares.AuthMiddleware(), controllers.MarkAsRead)
	router.PUT("/api/notifications/read-all", middlewares.AuthMiddleware(), controllers.MarkAllAsRead)
	router.DELETE("/api/notifications/:id", middlewares.AuthMiddleware(), controllers.DeleteNotification)
	router.DELETE("/api/notifications/clear-all", middlewares.AuthMiddleware(), controllers.ClearAllNotifications)

	// ============= SUPERADMIN ONLY ROUTES =============
	// Audit Logs
	router.GET("/api/admin/audit-logs", middlewares.AuthMiddleware(), controllers.GetAuditLogs)
	router.GET("/api/admin/audit-logs/stats", middlewares.AuthMiddleware(), controllers.GetAuditLogStats)

	// System Settings
	router.GET("/api/admin/settings", middlewares.AuthMiddleware(), controllers.GetSystemSettings)
	router.PUT("/api/admin/settings/:id", middlewares.AuthMiddleware(), controllers.UpdateSystemSetting)
	router.PUT("/api/admin/settings/bulk", middlewares.AuthMiddleware(), controllers.BulkUpdateSystemSettings)
	router.GET("/api/public/settings", controllers.GetPublicSettings) // Public settings tanpa auth

	// Broadcasts
	router.GET("/api/admin/broadcasts", middlewares.AuthMiddleware(), controllers.GetBroadcasts)
	router.POST("/api/admin/broadcasts", middlewares.AuthMiddleware(), controllers.CreateBroadcast)
	router.DELETE("/api/admin/broadcasts/:id", middlewares.AuthMiddleware(), controllers.DeleteBroadcast)
	router.GET("/api/admin/broadcasts/stats", middlewares.AuthMiddleware(), controllers.GetBroadcastStats)
	router.GET("/api/broadcasts", middlewares.AuthMiddleware(), controllers.GetUserBroadcasts)          // User broadcasts
	router.PUT("/api/broadcasts/:id/read", middlewares.AuthMiddleware(), controllers.MarkBroadcastRead) // Mark as read

	// All Activities (superadmin can see all)
	router.GET("/api/admin/activities", middlewares.AuthMiddleware(), controllers.GetAllActivities)

	// ============= MASTER DATA ROUTES (Superadmin & Ketua Himpunan Only) =============
	masterGroup := router.Group("/api/master")
	masterGroup.Use(middlewares.AuthMiddleware(), middlewares.MasterAccessMiddleware())
	{
		// Universities
		masterGroup.GET("/universities", controllers.GetUniversities)
		masterGroup.GET("/universities/:id", controllers.GetUniversityByID)
		masterGroup.POST("/universities", controllers.CreateUniversity)
		masterGroup.PUT("/universities/:id", controllers.UpdateUniversity)
		masterGroup.DELETE("/universities/:id", controllers.DeleteUniversity)

		// Faculties
		masterGroup.GET("/faculties", controllers.GetFaculties)
		masterGroup.GET("/faculties/:id", controllers.GetFacultyByID)
		masterGroup.POST("/faculties", controllers.CreateFaculty)
		masterGroup.PUT("/faculties/:id", controllers.UpdateFaculty)
		masterGroup.DELETE("/faculties/:id", controllers.DeleteFaculty)

		// Study Programs
		masterGroup.GET("/study-programs", controllers.GetStudyPrograms)
		masterGroup.GET("/study-programs/:id", controllers.GetStudyProgramByID)
		masterGroup.POST("/study-programs", controllers.CreateStudyProgram)
		masterGroup.PUT("/study-programs/:id", controllers.UpdateStudyProgram)
		masterGroup.DELETE("/study-programs/:id", controllers.DeleteStudyProgram)

		// Students
		masterGroup.GET("/students", controllers.GetStudents)
		masterGroup.GET("/students/:id", controllers.GetStudentByID)
		masterGroup.POST("/students", controllers.CreateStudent)
		masterGroup.PUT("/students/:id", controllers.UpdateStudent)
		masterGroup.DELETE("/students/:id", controllers.DeleteStudent)

		// Organizations
		masterGroup.GET("/organizations", controllers.GetOrganizations)
		masterGroup.GET("/organizations/:id", controllers.GetOrganizationByID)
		masterGroup.POST("/organizations", controllers.CreateOrganization)
		masterGroup.PUT("/organizations/:id", controllers.UpdateOrganization)
		masterGroup.DELETE("/organizations/:id", controllers.DeleteOrganization)

		// Users (Master Data)
		masterGroup.GET("/users", controllers.GetMasterUsers)
		masterGroup.GET("/users/:id", controllers.GetMasterUserByID)
		masterGroup.POST("/users", controllers.CreateMasterUser)
		masterGroup.PUT("/users/:id", controllers.UpdateMasterUser)
		masterGroup.DELETE("/users/:id", controllers.DeleteMasterUser)

		// Roles (for dropdown)
		masterGroup.GET("/roles", controllers.GetRoles)
	}

	return router
}
