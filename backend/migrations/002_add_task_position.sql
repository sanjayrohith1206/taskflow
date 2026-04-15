-- +goose Up
ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0;

-- Set initial positions based on creation date for existing tasks
WITH ranked_tasks AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id, status ORDER BY created_at ASC) - 1 as new_pos
    FROM tasks
)
UPDATE tasks t
SET position = r.new_pos
FROM ranked_tasks r
WHERE t.id = r.id;

-- +goose Down
ALTER TABLE tasks DROP COLUMN position;
