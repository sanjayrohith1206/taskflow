package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/taskflow/backend/internal/middleware"
	"github.com/taskflow/backend/internal/model"
	"github.com/taskflow/backend/internal/repository"
)

type ProjectHandler struct {
	projectRepo *repository.ProjectRepository
	taskRepo    *repository.TaskRepository
}

func NewProjectHandler(projectRepo *repository.ProjectRepository, taskRepo *repository.TaskRepository) *ProjectHandler {
	return &ProjectHandler{
		projectRepo: projectRepo,
		taskRepo:    taskRepo,
	}
}

func (h *ProjectHandler) List(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	projects, err := h.projectRepo.List(c.UserContext(), claims.UserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	return c.JSON(fiber.Map{"projects": projects})
}

func (h *ProjectHandler) Create(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	var p model.Project
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if p.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "validation failed",
			"fields": map[string]string{"name": "is required"},
		})
	}

	p.OwnerID = claims.UserID
	if err := h.projectRepo.Create(c.UserContext(), &p); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	return c.Status(fiber.StatusCreated).JSON(p)
}

func (h *ProjectHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid project id"})
	}

	p, err := h.projectRepo.GetByID(c.UserContext(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}
	if p == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}

	// Pagination
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	if page < 1 { page = 1 }
	if limit < 1 { limit = 10 }
	offset := (page - 1) * limit

	status := c.Query("status")
	tasks, err := h.taskRepo.ListByProject(c.UserContext(), id, status, "", limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}
	
	total, err := h.taskRepo.CountByProject(c.UserContext(), id, status)
	if err != nil {
		// Log error but don't fail the whole request
		total = len(tasks)
	}

	return c.JSON(fiber.Map{
		"project":      p,
		"tasks":        tasks,
		"total_tasks":  total,
		"current_page": page,
		"page_size":    limit,
	})
}

func (h *ProjectHandler) Update(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	id, _ := uuid.Parse(c.Params("id"))

	existing, _ := h.projectRepo.GetByID(c.UserContext(), id)
	if existing == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}

	if existing.OwnerID != claims.UserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	var p model.Project
	c.BodyParser(&p)
	p.ID = id
	if p.Name == "" {
		p.Name = existing.Name
	}

	if err := h.projectRepo.Update(c.UserContext(), &p); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	return c.JSON(p)
}

func (h *ProjectHandler) Delete(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	id, _ := uuid.Parse(c.Params("id"))

	existing, _ := h.projectRepo.GetByID(c.UserContext(), id)
	if existing == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}

	if existing.OwnerID != claims.UserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	if err := h.projectRepo.Delete(c.UserContext(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *ProjectHandler) GetStats(c *fiber.Ctx) error {
	id, _ := uuid.Parse(c.Params("id"))
	stats, err := h.taskRepo.GetStatsByProject(c.UserContext(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}
	return c.JSON(stats)
}
