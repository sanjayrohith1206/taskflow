-- +goose Up
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Seed Initial Data
INSERT INTO users (id, name, email, password_hash) VALUES 
('00000000-0000-0000-0000-000000000001', 'Test User', 'test@example.com', '$2a$12$V.oZ5nC.qV8/jCkzZ9u.e.I1uL7y5K4P/uV0lX.4b7/t.mZ/lH/m'); -- Password is 'password123'

INSERT INTO projects (id, name, description, owner_id) VALUES 
('00000000-0000-0000-0000-000000000002', 'Sample Project', 'A project to get you started.', '00000000-0000-0000-0000-000000000001');

INSERT INTO tasks (title, status, priority, project_id, assignee_id) VALUES 
('Setup Backend', 'done', 'high', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
('Design UI', 'in_progress', 'medium', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
('Write Integration Tests', 'todo', 'low', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');

-- +goose Down
DROP TABLE tasks;
DROP TABLE projects;
DROP TABLE users;
