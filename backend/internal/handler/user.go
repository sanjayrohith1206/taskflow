package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/taskflow/backend/internal/repository"
)

type UserHandler struct {
	userRepo *repository.UserRepository
}

func NewUserHandler(userRepo *repository.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

func (h *UserHandler) List(c *fiber.Ctx) error {
	users, err := h.userRepo.List(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	return c.JSON(fiber.Map{"users": users})
}
