# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install dependencies for migration tools
RUN apk add --no-cache gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the application
RUN go build -o main ./cmd/api/main.go

# Runtime stage
FROM alpine:latest

WORKDIR /app

# Install goose for migrations
RUN wget -O /usr/local/bin/goose https://github.com/pressly/goose/releases/download/v3.20.0/goose_linux_x86_64 && \
    chmod +x /usr/local/bin/goose

COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations

# Expose port and start
EXPOSE 8080

# Script to run migrations and then the application
RUN printf "#!/bin/sh\n/usr/local/bin/goose -dir ./migrations postgres \"\$DATABASE_URL\" up\n./main\n" > entrypoint.sh && \
    chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
