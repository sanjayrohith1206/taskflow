package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/taskflow/backend/internal/auth"
)

func Auth(jwtSecret []byte) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		claims, err := auth.ValidateToken(parts[1], jwtSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		c.Locals("user", claims)
		return c.Next()
	}
}

func GetUserClaims(c *fiber.Ctx) *auth.Claims {
	claims, ok := c.Locals("user").(*auth.Claims)
	if !ok {
		return nil
	}
	return claims
}
