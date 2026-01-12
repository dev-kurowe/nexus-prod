package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/models"

	"github.com/gin-gonic/gin"
)

// Helper sederhana
func stringToUint(s string) uint {
	var i uint
	fmt.Sscanf(s, "%d", &i)
	return i
}

// GET /api/events/:id/form
func GetFormSchema(c *gin.Context) {
	eventID := c.Param("id")
	var fields []models.FormField

	if err := database.DB.Where("event_id = ?", eventID).Order("`order` asc").Find(&fields).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengambil form"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": fields})
}

// POST /api/events/:id/form
func CreateFormField(c *gin.Context) {
	eventID := c.Param("id")

	var input struct {
		Label           string   `json:"label"`
		FieldType       string   `json:"field_type"`
		Options         []string `json:"options"`
		IsRequired      bool     `json:"is_required"`
		ParentFieldID   *uint    `json:"parent_field_id"`   // ID field parent jika ini adalah conditional field
		ConditionalValue string  `json:"conditional_value"` // Nilai yang harus dipenuhi dari parent field
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data tidak valid", "error": err.Error()})
		return
	}

	optionsJSON, _ := json.Marshal(input.Options)

	field := models.FormField{
		EventID:         stringToUint(eventID),
		Label:           input.Label,
		FieldType:       input.FieldType,
		Options:         optionsJSON,
		IsRequired:      input.IsRequired,
		ParentFieldID:   input.ParentFieldID,
		ConditionalValue: input.ConditionalValue,
		Order:           0,
	}

	if err := database.DB.Create(&field).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan pertanyaan"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "message": "Pertanyaan ditambahkan", "data": field})
}

// DELETE /api/form-fields/:id
func DeleteFormField(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.FormField{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal menghapus"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Berhasil dihapus"})
}
