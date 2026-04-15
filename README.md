# TaskFlow - Project Management System

TaskFlow is a minimal but powerful project and task management system designed with a clean architecture and a premium user experience.

## Tech Stack

- **Backend**: Go (Chi context-aware router, SQL connectivity, JWT Auth)
- **Frontend**: React 19 + TypeScript (Vite, Custom CSS with Glassmorphism)
- **Database**: PostgreSQL 15
- **Infrastructure**: Docker & Docker Compose

## Architecture Decisions

1. **Layered Backend Architecture**: I chose a repository/handler pattern for the Go backend. This ensures a clear separation of concerns, making the database logic isolated from the HTTP handling logic.
2. **Custom Design System**: Instead of using a heavy component library, I built a custom design system using Vanilla CSS tokens. This allowed for a highly polished "Glassmorphism" look that feels premium and unique.
3. **Stateless Auth**: JWT is used for authentication, allowing the backend to remain stateless. A 24-hour expiry is enforced for security.
4. **Optimistic UI**: For task status changes, the frontend updates the status immediately and reverts if the API call fails, providing a snappy user experience.
5. **Multi-stage Docker Builds**: Used to minimize the production image size of the Go backend and serve the React app via a lightweight Nginx container.

## Running Locally

### Prerequisites
- Docker and Docker Compose installed.

### Setup
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd taskflow
   ```

2. Generate environment file:
   ```bash
   cp .env.example .env
   ```

3. Spin up the stack:
   ```bash
   docker compose up --build
   ```

The application will be available at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

## Running Migrations

Migrations run **automatically** on container start via the backend's entrypoint script using `goose`. If you wish to run them manually:
```bash
docker compose exec backend /usr/local/bin/goose -dir ./migrations postgres "$DATABASE_URL" up
```

## Test Credentials

A seed user is created automatically during the initial migration:
- **Email**: `test@example.com`
- **Password**: `password123`

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and receive JWT |
| GET | `/projects` | List accessible projects |
| POST | `/projects` | Create a new project |
| GET | `/projects/:id` | Get project details & tasks |
| PATCH | `/projects/:id` | Update project details |
| DELETE | `/projects/:id` | Delete project and tasks |
| GET | `/projects/:id/stats` | Task counts by status/assignee |
| GET | `/projects/:id/tasks` | List tasks with filters |
| POST | `/projects/:id/tasks` | Add task to project |
| PATCH | `/tasks/:id` | Update task status/priority |
| DELETE | `/tasks/:id` | Delete specific task |

## What I'd Do With More Time

1. **Integration Testing**: Add a robust suite of Go integration tests using `testcontainers-go` to ensure DB interactions are verified in isolation.
2. **Real-time Notifications**: Implement WebSockets or Server-Sent Events (SSE) to notify users when a task is updated by someone else.
3. **Drag and Drop**: Implement a Kanban-style board using `dnd-kit` or `react-beautiful-dnd` for better task visualization.
4. **Enhanced Search**: Replace basic client-side filtering with a full-text search backend implementation using Postgres `tsvector`.
5. **Deployment Optimization**: Setup a CI/CD pipeline (GitHub Actions) for automatic linting, testing, and Docker image publishing.
