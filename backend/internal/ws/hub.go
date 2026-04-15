package ws

import (
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/gofiber/websocket/v2"
)

type Event struct {
	Type      string      `json:"type"`
	ProjectID string      `json:"project_id"`
	Payload   interface{} `json:"payload"`
}

type Client struct {
	Conn      *websocket.Conn
	ProjectID string
}

type Hub struct {
	clients    map[*websocket.Conn]*Client
	register   chan *Client
	unregister chan *websocket.Conn
	broadcast  chan Event
	mu         sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]*Client),
		register:   make(chan *Client),
		unregister: make(chan *websocket.Conn),
		broadcast:  make(chan Event),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.Conn] = client
			h.mu.Unlock()
			slog.Info("ws client connected", "project_id", client.ProjectID)

		case conn := <-h.unregister:
			h.mu.Lock()
			if client, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
				slog.Info("ws client disconnected", "project_id", client.ProjectID)
			}
			h.mu.Unlock()

		case event := <-h.broadcast:
			h.mu.Lock()
			for conn, client := range h.clients {
				if client.ProjectID == event.ProjectID {
					msg, _ := json.Marshal(event)
					if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
						slog.Error("ws broadcast failed", "error", err)
						conn.Close()
						delete(h.clients, conn)
					}
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) Register(conn *websocket.Conn, projectID string) {
	h.register <- &Client{Conn: conn, ProjectID: projectID}
}

func (h *Hub) Unregister(conn *websocket.Conn) {
	h.unregister <- conn
}

func (h *Hub) Broadcast(projectID string, eventType string, payload interface{}) {
	h.broadcast <- Event{
		Type:      eventType,
		ProjectID: projectID,
		Payload:   payload,
	}
}
