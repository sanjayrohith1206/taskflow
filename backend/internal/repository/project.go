package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/taskflow/backend/internal/model"
)

type ProjectRepository struct {
	db *sql.DB
}

func NewProjectRepository(db *sql.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) Create(ctx context.Context, project *model.Project) error {
	query := `INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id, created_at`
	return r.db.QueryRowContext(ctx, query, project.Name, project.Description, project.OwnerID).Scan(&project.ID, &project.CreatedAt)
}

func (r *ProjectRepository) List(ctx context.Context, userID uuid.UUID) ([]model.Project, error) {
	// List projects the user owns or has tasks in
	query := `
		SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at 
		FROM projects p
		LEFT JOIN tasks t ON p.id = t.project_id
		WHERE p.owner_id = $1 OR t.assignee_id = $1
		ORDER BY p.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []model.Project
	for rows.Next() {
		var p model.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, nil
}

func (r *ProjectRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Project, error) {
	query := `SELECT id, name, description, owner_id, created_at FROM projects WHERE id = $1`
	p := &model.Project{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return p, nil
}

func (r *ProjectRepository) Update(ctx context.Context, project *model.Project) error {
	query := `UPDATE projects SET name = $1, description = $2 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, query, project.Name, project.Description, project.ID)
	return err
}

func (r *ProjectRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM projects WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
