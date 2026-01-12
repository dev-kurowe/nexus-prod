package controllers

import (
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func Login(c *gin.Context) {

	// Inisialisasi struct
	var req = structs.UserLoginRequest{}
	var user = models.User{}

	// Validasi input
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, structs.ErrorResponse{
			Success: false,
			Message: "Validation Errors",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}
	if err := database.DB.Preload("Role").Where("email = ? OR username = ?", req.Username, req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "User Not Found (Email/Username salah)",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Cek Password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, structs.ErrorResponse{
			Success: false,
			Message: "Invalid Password",
			Errors:  helpers.TranslateErrorMessage(err),
		})
		return
	}

	// Generate Token
	token := helpers.GenerateToken(user.ID)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Login Success",
		Data: structs.UserResponse{
			Id:        user.ID,
			Name:      user.Name,
			Username:  user.Username,
			Email:     user.Email,
			Role:      user.Role.Code,
			RoleID:    user.RoleID,
			Avatar:    user.Avatar,
			CreatedAt: user.CreatedAt.String(),
			UpdatedAt: user.UpdatedAt.String(),
			Token:     &token,
		},
	})
}
