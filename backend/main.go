package main

import (
	"database/sql"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
	"github.com/taskflow/backend/internal/handler"
	authMiddleware "github.com/taskflow/backend/internal/middleware"
	"github.com/taskflow/backend/internal/repository"
	"github.com/taskflow/backend/internal/ws"
	"github.com/gofiber/websocket/v2"
)

func runMigrations(db *sql.DB) error {
	goose.SetDialect("postgres")

	if err := goose.Up(db, "./migrations"); err != nil {
		return err
	}
	return nil
}

func main() {
	// Initialize logger
	l := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(l)

	// Load environment variables
	godotenv.Load()           // Current directory

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		slog.Error("Can't Find the Database URL")
		os.Exit(1)
	}

	jwtSecret := []byte(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) == 0 {
		slog.Error("Can't Find the JWT Secret")
		os.Exit(1)
	}

	port := os.Getenv("PORT")
	if port == "" {
		slog.Error("Can't Find the Port")
		os.Exit(1)
	}

	// Database connection
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		slog.Error("failed to ping database", "error", err)
		os.Exit(1)
	}

	// Run migrations
	if err := runMigrations(db); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	projectRepo := repository.NewProjectRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	hub := ws.NewHub()
	go hub.Run()

	// Initialize handlers
	authHandler := handler.NewAuthHandler(userRepo, jwtSecret)
	projectHandler := handler.NewProjectHandler(projectRepo, taskRepo)
	taskHandler := handler.NewTaskHandler(taskRepo, projectRepo, hub)
	userHandler := handler.NewUserHandler(userRepo)

	// Fiber app setup
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PATCH,DELETE,OPTIONS",
		AllowHeaders: "Accept,Authorization,Content-Type,X-CSRF-Token",
	}))

	// Routes
	auth := app.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)

	// WebSocket endpoint (Public, handles its own auth if needed)
	app.Get("/ws/:id", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}, websocket.New(func(c *websocket.Conn) {
		projectID := c.Params("id")
		hub.Register(c, projectID)
		defer hub.Unregister(c)

		for {
			if _, _, err := c.ReadMessage(); err != nil {
				break
			}
		}
	}))

	api := app.Group("/", authMiddleware.Auth(jwtSecret))
	
	api.Get("/users", userHandler.List)
	
	projects := api.Group("/projects")
	projects.Get("/", projectHandler.List)
	projects.Post("/", projectHandler.Create)
	projects.Get("/:id", projectHandler.GetByID)
	projects.Patch("/:id", projectHandler.Update)
	projects.Delete("/:id", projectHandler.Delete)
	projects.Get("/:id/stats", projectHandler.GetStats)

	projects.Get("/:id/tasks", taskHandler.List)
	projects.Post("/:id/tasks", taskHandler.Create)
	
	api.Patch("/tasks/:id", taskHandler.Update)
	api.Delete("/tasks/:id", taskHandler.Delete)

	// Graceful shutdown
	go func() {
		slog.Info("server starting", "port", port)
		if err := app.Listen(":" + port); err != nil {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("server stopping")
	if err := app.Shutdown(); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}
	slog.Info("server exited properly")
}
