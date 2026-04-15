package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/taskflow/backend/internal/middleware"
	"github.com/taskflow/backend/internal/model"
	"github.com/taskflow/backend/internal/repository"
	"github.com/taskflow/backend/internal/ws"
)

type TaskHandler struct {
	taskRepo    *repository.TaskRepository
	projectRepo *repository.ProjectRepository
	hub         *ws.Hub
}

func NewTaskHandler(taskRepo *repository.TaskRepository, projectRepo *repository.ProjectRepository, hub *ws.Hub) *TaskHandler {
	return &TaskHandler{
		taskRepo:    taskRepo,
		projectRepo: projectRepo,
		hub:         hub,
	}
}

func (h *TaskHandler) List(c *fiber.Ctx) error {
	projectID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid project id"})
	}

	status := c.Query("status")
	assigneeID := c.Query("assignee")

	tasks, err := h.taskRepo.ListByProject(c.UserContext(), projectID, status, assigneeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	return c.JSON(fiber.Map{"tasks": tasks})
}

func (h *TaskHandler) Create(c *fiber.Ctx) error {
	projectID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid project id"})
	}

	var t model.Task
	if err := c.BodyParser(&t); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if t.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "validation failed",
			"fields": map[string]string{"title": "is required"},
		})
	}

	t.ProjectID = projectID
	if t.Status == "" {
		t.Status = model.StatusTodo
	}
	if t.Priority == "" {
		t.Priority = model.PriorityMedium
	}

	if err := h.taskRepo.Create(c.UserContext(), &t); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	h.hub.Broadcast(projectID.String(), "TASK_CREATED", t)

	return c.Status(fiber.StatusCreated).JSON(t)
}

func (h *TaskHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid task id"})
	}

	existing, err := h.taskRepo.GetByID(c.UserContext(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}

	var t model.Task
	if err := c.BodyParser(&t); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	t.ID = id
	if t.Title == "" {
		t.Title = existing.Title
	}
	if t.Status == "" {
		t.Status = existing.Status
	}
	if t.Priority == "" {
		t.Priority = existing.Priority
	}

	if err := h.taskRepo.Update(c.UserContext(), &t); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	h.hub.Broadcast(t.ProjectID.String(), "TASK_UPDATED", t)

	return c.JSON(t)
}

func (h *TaskHandler) Delete(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid task id"})
	}

	existing, err := h.taskRepo.GetByID(c.UserContext(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}

	project, err := h.projectRepo.GetByID(c.UserContext(), existing.ProjectID)
	if err != nil || project == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}

	if project.OwnerID != claims.UserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	if err := h.taskRepo.Delete(c.UserContext(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	h.hub.Broadcast(existing.ProjectID.String(), "TASK_DELETED", id.String())

	return c.SendStatus(fiber.StatusNoContent)
}
