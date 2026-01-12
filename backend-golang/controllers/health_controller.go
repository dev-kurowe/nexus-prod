package controllers

import (
	"net/http"
	"santrikoding/backend-api/database"

	"github.com/gin-gonic/gin"
)

// HealthCheck handles health check requests
func HealthCheck(c *gin.Context) {
	// Check database connection
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "unhealthy",
			"message": "Database connection not available",
		})
		return
	}

	// Test database connection
	sqlDB, err := db.DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "unhealthy",
			"message": "Failed to get database instance",
		})
		return
	}

	if err := sqlDB.Ping(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "unhealthy",
			"message": "Database ping failed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"message": "Service is running",
	})
}

// ReadinessCheck handles readiness probe requests (simpler, faster)
func ReadinessCheck(c *gin.Context) {
	// Simple check - just verify server is responding
	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
	})
}

// LivenessCheck handles liveness probe requests
func LivenessCheck(c *gin.Context) {
	// Simple check - just verify server is alive
	c.JSON(http.StatusOK, gin.H{
		"status": "alive",
	})
}
