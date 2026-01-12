package controllers

import (
	"log"
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"

	"github.com/gin-gonic/gin"
)

// SendVerificationCode mengirimkan kode verifikasi ke email
func SendVerificationCode(c *gin.Context) {
	var req struct {
		Name           string `json:"name" binding:"required"`
		Username       string `json:"username" binding:"required"`
		Email          string `json:"email" binding:"required,email"`
		Password       string `json:"password" binding:"required"`
		Phone          string `json:"phone"`
		UniversityID   *uint  `json:"university_id"`
		FacultyID      *uint  `json:"faculty_id"`
		StudyProgramID *uint  `json:"study_program_id"`
		Angkatan       string `json:"angkatan"`
	}

	// Validasi request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validasi Errors",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Cek apakah email atau username sudah terdaftar
	var existingUser models.User
	if err := database.DB.Where("email = ? OR username = ?", req.Email, req.Username).First(&existingUser).Error; err == nil {
		if existingUser.Email == req.Email {
			c.JSON(http.StatusConflict, structs.ErrorResponse{
				Success: false,
				Message: "Email sudah terdaftar",
				Errors:  map[string]string{"email": "Email sudah terdaftar"},
			})
			return
		}
		if existingUser.Username == req.Username {
			c.JSON(http.StatusConflict, structs.ErrorResponse{
				Success: false,
				Message: "Username sudah terdaftar",
				Errors:  map[string]string{"username": "Username sudah terdaftar"},
			})
			return
		}
	}

	// Generate kode verifikasi
	verificationCode := helpers.GenerateVerificationCode()

	// Simpan data verifikasi sementara
	userData := map[string]interface{}{
		"name":             req.Name,
		"username":         req.Username,
		"password":         req.Password,
		"phone":            req.Phone,
		"university_id":    req.UniversityID,
		"faculty_id":       req.FacultyID,
		"study_program_id": req.StudyProgramID,
		"angkatan":         req.Angkatan,
	}
	helpers.StoreVerificationCode(req.Email, verificationCode, userData)

	// Kirim email verifikasi
	if err := helpers.SendVerificationEmail(req.Email, verificationCode); err != nil {
		log.Printf("Error sending verification email: %v", err)
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengirim email verifikasi. Pastikan SMTP sudah dikonfigurasi dengan benar.",
			Errors:  map[string]string{"email": "Gagal mengirim email"},
		})
		return
	}

	// Response sukses (tidak mengirim kode di response untuk keamanan)
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Kode verifikasi telah dikirim ke email Anda. Silakan cek inbox email Anda.",
		Data: gin.H{
			"email": req.Email,
		},
	})
}

// VerifyAndRegister memverifikasi kode dan membuat akun user
func VerifyAndRegister(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}

	// Validasi request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validasi Errors",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Verifikasi kode
	verificationData, err := helpers.VerifyCode(req.Email, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: err.Error(),
			Errors:  map[string]string{"code": err.Error()},
		})
		return
	}

	// Buat data user baru dengan password yang sudah di-hash
	// RoleID default adalah 8 (Mahasiswa) untuk user baru
	user := models.User{
		Name:           verificationData.Name,
		Username:       verificationData.Username,
		Email:          verificationData.Email,
		Password:       helpers.HashPassword(verificationData.Password),
		Phone:          verificationData.Phone,
		UniversityID:   verificationData.UniversityID,
		FacultyID:      verificationData.FacultyID,
		StudyProgramID: verificationData.StudyProgramID,
		Angkatan:       verificationData.Angkatan,
		RoleID:         8,
	}

	// Simpan data user ke database
	if err := database.DB.Create(&user).Error; err != nil {
		log.Printf("Error creating user: %v", err)

		// Cek apakah error karena data duplikat
		if helpers.IsDuplicateEntryError(err) {
			c.JSON(http.StatusConflict, structs.ErrorResponse{
				Success: false,
				Message: "Duplicate entry error",
				Errors:  helpers.TranslateErrorMessage(err),
			})
		} else {
			c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
				Success: false,
				Message: "Failed to create user",
				Errors: map[string]string{
					"error": err.Error(),
				},
			})
		}
		return
	}

	// Hapus kode verifikasi setelah digunakan
	helpers.DeleteVerificationCode(req.Email)

	// Jika berhasil, kirimkan response sukses
	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "User created successfully",
		Data: structs.UserResponse{
			Id:        user.ID,
			Name:      user.Name,
			Username:  user.Username,
			Email:     user.Email,
			CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	})
}
