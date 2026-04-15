package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/taskflow/backend/internal/model"
)

type TaskRepository struct {
	db *sql.DB
}

func NewTaskRepository(db *sql.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) Create(ctx context.Context, task *model.Task) error {
	query := `
		INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, due_date, position)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		task.Title, task.Description, task.Status, task.Priority,
		task.ProjectID, task.AssigneeID, task.DueDate, task.Position,
	).Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)
}

func (r *TaskRepository) ListByProject(ctx context.Context, projectID uuid.UUID, status string, assigneeID string) ([]model.Task, error) {
	query := `
		SELECT t.id, t.title, t.description, t.status, t.priority, t.project_id, t.assignee_id, u.name as assignee_name, t.position, t.due_date, t.created_at, t.updated_at 
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.project_id = $1`
	args := []interface{}{projectID}
	argCount := 2

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, status)
		argCount++
	}

	if assigneeID != "" {
		query += fmt.Sprintf(" AND t.assignee_id = $%d", argCount)
		args = append(args, assigneeID)
		argCount++
	}

	query += " ORDER BY t.position ASC, t.created_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []model.Task
	for rows.Next() {
		var t model.Task
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.ProjectID, &t.AssigneeID, &t.AssigneeName, &t.Position, &t.DueDate, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func (r *TaskRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Task, error) {
	query := `
		SELECT t.id, t.title, t.description, t.status, t.priority, t.project_id, t.assignee_id, u.name as assignee_name, t.position, t.due_date, t.created_at, t.updated_at 
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.id = $1`
	t := &model.Task{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.ProjectID, &t.AssigneeID, &t.AssigneeName, &t.Position, &t.DueDate, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *TaskRepository) Update(ctx context.Context, task *model.Task) error {
	query := `
		UPDATE tasks 
		SET title = $1, description = $2, status = $3, priority = $4, assignee_id = $5, due_date = $6, position = $7, updated_at = CURRENT_TIMESTAMP
		WHERE id = $8
		RETURNING updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		task.Title, task.Description, task.Status, task.Priority,
		task.AssigneeID, task.DueDate, task.Position, task.ID,
	).Scan(&task.UpdatedAt)
}

func (r *TaskRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM tasks WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *TaskRepository) GetStatsByProject(ctx context.Context, projectID uuid.UUID) (map[string]interface{}, error) {
	// Status counts
	statusQuery := `SELECT status, count(*) FROM tasks WHERE project_id = $1 GROUP BY status`
	statusRows, err := r.db.QueryContext(ctx, statusQuery, projectID)
	if err != nil {
		return nil, err
	}
	defer statusRows.Close()

	byStatus := make(map[string]int)
	for statusRows.Next() {
		var status string
		var count int
		if err := statusRows.Scan(&status, &count); err != nil {
			return nil, err
		}
		byStatus[status] = count
	}

	// Assignee counts
	assigneeQuery := `
		SELECT u.name, count(t.id) 
		FROM tasks t 
		JOIN users u ON t.assignee_id = u.id 
		WHERE t.project_id = $1 
		GROUP BY u.name
	`
	assigneeRows, err := r.db.QueryContext(ctx, assigneeQuery, projectID)
	if err != nil {
		return nil, err
	}
	defer assigneeRows.Close()

	byAssignee := make(map[string]int)
	for assigneeRows.Next() {
		var name string
		var count int
		if err := assigneeRows.Scan(&name, &count); err != nil {
			return nil, err
		}
		byAssignee[name] = count
	}

	return map[string]interface{}{
		"by_status":   byStatus,
		"by_assignee": byAssignee,
	}, nil
}
