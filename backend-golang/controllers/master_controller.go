package controllers

import (
	"net/http"
	"santrikoding/backend-api/database"
	"santrikoding/backend-api/helpers"
	"santrikoding/backend-api/models"
	"santrikoding/backend-api/structs"

	"github.com/gin-gonic/gin"
)

// ============= UNIVERSITY CONTROLLERS =============

func GetUniversities(c *gin.Context) {
	var universities []models.University
	if err := database.DB.Order("name ASC").Find(&universities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data universitas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data universitas berhasil diambil",
		Data:    universities,
	})
}

func GetUniversityByID(c *gin.Context) {
	id := c.Param("id")
	var university models.University
	if err := database.DB.First(&university, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Universitas tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data universitas berhasil diambil",
		Data:    university,
	})
}

func CreateUniversity(c *gin.Context) {
	var university models.University
	if err := c.ShouldBindJSON(&university); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Create(&university).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menambah universitas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Universitas berhasil ditambahkan",
		Data:    university,
	})
}

func UpdateUniversity(c *gin.Context) {
	id := c.Param("id")
	var university models.University
	if err := database.DB.First(&university, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Universitas tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := c.ShouldBindJSON(&university); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Save(&university).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate universitas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Universitas berhasil diupdate",
		Data:    university,
	})
}

func DeleteUniversity(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.University{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus universitas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Universitas berhasil dihapus",
		Data:    nil,
	})
}

// ============= FACULTY CONTROLLERS =============

func GetFaculties(c *gin.Context) {
	var faculties []models.Faculty
	if err := database.DB.Preload("University").Order("name ASC").Find(&faculties).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data fakultas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data fakultas berhasil diambil",
		Data:    faculties,
	})
}

func GetFacultyByID(c *gin.Context) {
	id := c.Param("id")
	var faculty models.Faculty
	if err := database.DB.Preload("University").First(&faculty, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Fakultas tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data fakultas berhasil diambil",
		Data:    faculty,
	})
}

func CreateFaculty(c *gin.Context) {
	var faculty models.Faculty
	if err := c.ShouldBindJSON(&faculty); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Create(&faculty).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menambah fakultas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	// Preload untuk response
	database.DB.Preload("University").First(&faculty, faculty.ID)
	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Fakultas berhasil ditambahkan",
		Data:    faculty,
	})
}

func UpdateFaculty(c *gin.Context) {
	id := c.Param("id")
	var faculty models.Faculty
	if err := database.DB.First(&faculty, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Fakultas tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := c.ShouldBindJSON(&faculty); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Save(&faculty).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate fakultas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	database.DB.Preload("University").First(&faculty, faculty.ID)
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Fakultas berhasil diupdate",
		Data:    faculty,
	})
}

func DeleteFaculty(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Faculty{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus fakultas",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Fakultas berhasil dihapus",
		Data:    nil,
	})
}

// ============= STUDY PROGRAM CONTROLLERS =============

func GetStudyPrograms(c *gin.Context) {
	var programs []models.StudyProgram
	if err := database.DB.Preload("Faculty.University").Order("name ASC").Find(&programs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data program studi",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data program studi berhasil diambil",
		Data:    programs,
	})
}

func GetStudyProgramByID(c *gin.Context) {
	id := c.Param("id")
	var program models.StudyProgram
	if err := database.DB.Preload("Faculty.University").First(&program, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Program studi tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data program studi berhasil diambil",
		Data:    program,
	})
}

func CreateStudyProgram(c *gin.Context) {
	var program models.StudyProgram
	if err := c.ShouldBindJSON(&program); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Create(&program).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menambah program studi",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	database.DB.Preload("Faculty.University").First(&program, program.ID)
	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Program studi berhasil ditambahkan",
		Data:    program,
	})
}

func UpdateStudyProgram(c *gin.Context) {
	id := c.Param("id")
	var program models.StudyProgram
	if err := database.DB.First(&program, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Program studi tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := c.ShouldBindJSON(&program); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Save(&program).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate program studi",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	database.DB.Preload("Faculty.University").First(&program, program.ID)
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Program studi berhasil diupdate",
		Data:    program,
	})
}

func DeleteStudyProgram(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.StudyProgram{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus program studi",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Program studi berhasil dihapus",
		Data:    nil,
	})
}

// ============= STUDENT CONTROLLERS =============

func GetStudents(c *gin.Context) {
	var students []models.Student
	if err := database.DB.Preload("StudyProgram.Faculty.University").Order("name ASC").Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data mahasiswa",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data mahasiswa berhasil diambil",
		Data:    students,
	})
}

func GetStudentByID(c *gin.Context) {
	id := c.Param("id")
	var student models.Student
	if err := database.DB.Preload("StudyProgram.Faculty.University").First(&student, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Mahasiswa tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data mahasiswa berhasil diambil",
		Data:    student,
	})
}

func CreateStudent(c *gin.Context) {
	var student models.Student
	if err := c.ShouldBindJSON(&student); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Create(&student).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menambah mahasiswa",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	database.DB.Preload("StudyProgram.Faculty.University").First(&student, student.ID)
	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Mahasiswa berhasil ditambahkan",
		Data:    student,
	})
}

func UpdateStudent(c *gin.Context) {
	id := c.Param("id")
	var student models.Student
	if err := database.DB.First(&student, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Mahasiswa tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := c.ShouldBindJSON(&student); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Save(&student).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate mahasiswa",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	database.DB.Preload("StudyProgram.Faculty.University").First(&student, student.ID)
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Mahasiswa berhasil diupdate",
		Data:    student,
	})
}

func DeleteStudent(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Student{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus mahasiswa",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Mahasiswa berhasil dihapus",
		Data:    nil,
	})
}

// ============= ORGANIZATION CONTROLLERS =============

func GetOrganizations(c *gin.Context) {
	var organizations []models.Organization
	if err := database.DB.Preload("Faculty.University").Order("name ASC").Find(&organizations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data ormawa",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data ormawa berhasil diambil",
		Data:    organizations,
	})
}

func GetOrganizationByID(c *gin.Context) {
	id := c.Param("id")
	var organization models.Organization
	if err := database.DB.Preload("Faculty.University").First(&organization, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Ormawa tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data ormawa berhasil diambil",
		Data:    organization,
	})
}

func CreateOrganization(c *gin.Context) {
	var organization models.Organization
	if err := c.ShouldBindJSON(&organization); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Create(&organization).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menambah ormawa",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	database.DB.Preload("Faculty.University").First(&organization, organization.ID)
	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "Ormawa berhasil ditambahkan",
		Data:    organization,
	})
}

func UpdateOrganization(c *gin.Context) {
	id := c.Param("id")
	var organization models.Organization
	if err := database.DB.First(&organization, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "Ormawa tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := c.ShouldBindJSON(&organization); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Data tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	if err := database.DB.Save(&organization).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate ormawa",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	database.DB.Preload("Faculty.University").First(&organization, organization.ID)
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Ormawa berhasil diupdate",
		Data:    organization,
	})
}

func DeleteOrganization(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Organization{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus ormawa",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Ormawa berhasil dihapus",
		Data:    nil,
	})
}

// ============= MASTER USER CONTROLLERS =============

func GetMasterUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Preload("Role").Order("id ASC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data user",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data user berhasil diambil",
		Data:    users,
	})
}

func GetMasterUserByID(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.Preload("Role").First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "User tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data user berhasil diambil",
		Data:    user,
	})
}

func CreateMasterUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Input tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Hash password sebelum disimpan
	if user.Password != "" {
		user.Password = helpers.HashPassword(user.Password)
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal membuat user",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Load role after create
	database.DB.Preload("Role").First(&user, user.ID)

	c.JSON(http.StatusCreated, structs.SuccessResponse{
		Success: true,
		Message: "User berhasil dibuat",
		Data:    user,
	})
}

func UpdateMasterUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, structs.ErrorResponse{
			Success: false,
			Message: "User tidak ditemukan",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	var updateData models.User
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, structs.ErrorResponse{
			Success: false,
			Message: "Input tidak valid",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Jika password diubah, hash password baru
	if updateData.Password != "" {
		updateData.Password = helpers.HashPassword(updateData.Password)
	} else {
		// Jika password kosong, jangan update password
		updateData.Password = user.Password
	}

	if err := database.DB.Model(&user).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengupdate user",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}

	// Load role after update
	database.DB.Preload("Role").First(&user, user.ID)

	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "User berhasil diupdate",
		Data:    user,
	})
}

func DeleteMasterUser(c *gin.Context) {
	id := c.Param("id")

	// Cek apakah user superadmin (ID 1)
	if id == "1" {
		c.JSON(http.StatusForbidden, structs.ErrorResponse{
			Success: false,
			Message: "Superadmin tidak dapat dihapus",
			Errors:  map[string]string{"error": "Cannot delete superadmin"},
		})
		return
	}

	if err := database.DB.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal menghapus user",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "User berhasil dihapus",
		Data:    nil,
	})
}

// ============= GET ROLES FOR DROPDOWN =============

func GetRoles(c *gin.Context) {
	var roles []models.Role
	if err := database.DB.Order("name ASC").Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, structs.ErrorResponse{
			Success: false,
			Message: "Gagal mengambil data role",
			Errors:  map[string]string{"error": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, structs.SuccessResponse{
		Success: true,
		Message: "Data role berhasil diambil",
		Data:    roles,
	})
}
