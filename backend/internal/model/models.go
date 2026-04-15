package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// JSONDate is a custom type for handling both YYYY-MM-DD and RFC3339 JSON date formats
type JSONDate time.Time

func (j *JSONDate) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), "\"")
	if s == "null" || s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t, err = time.Parse("2006-01-02", s)
	}
	if err != nil {
		return err
	}
	*j = JSONDate(t)
	return nil
}

func (j JSONDate) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Time(j).Format(time.RFC3339))
}

func (j JSONDate) Value() (driver.Value, error) {
	return time.Time(j), nil
}

func (j *JSONDate) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	t, ok := value.(time.Time)
	if !ok {
		return fmt.Errorf("invalid time type")
	}
	*j = JSONDate(t)
	return nil
}

func (j JSONDate) String() string {
	return time.Time(j).Format("2006-01-02")
}

type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type Project struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	OwnerID     uuid.UUID `json:"owner_id" db:"owner_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	Tasks       []Task    `json:"tasks,omitempty"`
}

type TaskStatus string

const (
	StatusTodo       TaskStatus = "todo"
	StatusInProgress TaskStatus = "in_progress"
	StatusDone       TaskStatus = "done"
)

type TaskPriority string

const (
	PriorityLow    TaskPriority = "low"
	PriorityMedium TaskPriority = "medium"
	PriorityHigh   TaskPriority = "high"
)

type Task struct {
	ID           uuid.UUID    `json:"id" db:"id"`
	Title        string       `json:"title" db:"title"`
	Description  string       `json:"description" db:"description"`
	Status       TaskStatus   `json:"status" db:"status"`
	Priority     TaskPriority `json:"priority" db:"priority"`
	ProjectID    uuid.UUID    `json:"project_id" db:"project_id"`
	AssigneeID   *uuid.UUID   `json:"assignee_id" db:"assignee_id"`
	AssigneeName *string      `json:"assignee_name,omitempty" db:"assignee_name"`
	Position     int          `json:"position" db:"position"`
	DueDate      *JSONDate    `json:"due_date" db:"due_date"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at" db:"updated_at"`
}
