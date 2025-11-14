# Project Structure and Docker Setup

## Overview
A SIMS (Security Incident Management System) with the following stack:

- Frontend: TypeScript
- Backend: .NET 8.0 WebAPI
- Database: MySQL (via Entity Framework Core)
- Logging: Redis

Each component runs in its own Docker container. This document gives you a ready-to-use dev docker-compose, a .env template, example Dockerfiles, and a practical roadmap to start building.

## Suggested repository layout
You can adjust later, but this layout keeps infra and services organized.

- frontend/
- backend/
- infra/
  - docker-compose.yml
  - .env.example
  - nginx.conf (optional, prod)
- docs/
  - ProjectPlan.md
  - ProjectStructure.md (this file)

## Docker (development) — docker-compose.yml
Place this file at repo root or under `infra/` (adjust paths accordingly). Dev mode mounts your local code for rapid iteration.

```yaml
version: "3.9"

name: alertfrog

services:
  mysql:
    image: mysql:8.0
    container_name: alertfrog-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -p$$MYSQL_ROOT_PASSWORD"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - app-net
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: alertfrog-redis
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - app-net
    restart: unless-stopped

  backend:
    # For dev you can build+mount your local backend project
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: alertfrog-backend
    environment:
      ASPNETCORE_ENVIRONMENT: ${ASPNETCORE_ENVIRONMENT}
      ASPNETCORE_URLS: http://0.0.0.0:8080
      ConnectionStrings__Default: Server=mysql;Port=3306;Database=${MYSQL_DATABASE};User=${MYSQL_USER};Password=${MYSQL_PASSWORD};TreatTinyAsBoolean=false;SslMode=None;
      Redis__ConnectionString: ${REDIS_HOST}:${REDIS_PORT}
      JWT__Issuer: ${JWT_ISSUER}
      JWT__Audience: ${JWT_AUDIENCE}
      JWT__Key: ${JWT_SECRET}
    ports:
      - "8080:8080"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/src
    working_dir: /src
    command: ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:8080"]
    networks:
      - app-net
    restart: unless-stopped

  frontend:
    image: node:20-alpine
    container_name: alertfrog-frontend
    working_dir: /app
    environment:
      VITE_API_BASE_URL: ${VITE_API_BASE_URL}
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 5173"
    depends_on:
      - backend
    networks:
      - app-net
    restart: unless-stopped

volumes:
  mysql-data:
  redis-data:

networks:
  app-net:
    driver: bridge
```

## .env template — .env.example
Copy to `.env` and adjust secrets.

```bash
# Project
COMPOSE_PROJECT_NAME=alertfrog
ASPNETCORE_ENVIRONMENT=Development

# MySQL
MYSQL_ROOT_PASSWORD=change-me-root
MYSQL_DATABASE=alertfrog
MYSQL_USER=alertfrog
MYSQL_PASSWORD=change-me-user

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Backend Auth (JWT)
JWT_ISSUER=alertfrog
JWT_AUDIENCE=alertfrog
# Use a 32+ char random value in real setups
JWT_SECRET=please-change-this-super-secret-key

# Frontend config
# Inside containers prefer backend hostname; from browser you’ll hit localhost:8080
VITE_API_BASE_URL=http://backend:8080
```

## Backend Dockerfile (example for production)
Place in `backend/Dockerfile`. For dev, `docker-compose` above mounts your code and runs `dotnet watch`.

```dockerfile
# backend/Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore \
 && dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Backend.dll"]
```

## Frontend Dockerfile (example for production)
Serves a static build via Nginx. Dev uses the Compose service above.

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

Optional Nginx config if you want to proxy `/api` to backend in prod:

```nginx
# infra/nginx.conf (optional)
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location /api/ {
    proxy_pass http://backend:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## Getting started

- Create folders `frontend/` and `backend/` and scaffold apps (examples):
  - Frontend: `npm create vite@latest frontend -- --template react-ts`
  - Backend: `dotnet new webapi -n Backend` (place the project in `backend/`)
- Copy `.env.example` to `.env` and edit secrets.
- Start dev stack:
  - `docker compose up -d` (or `docker compose -f infra/docker-compose.yml up -d`)
- URLs:
  - Frontend (dev): http://localhost:5173
  - Backend (Swagger if enabled): http://localhost:8080/swagger
- Apply EF Core migrations (after you add DbContext & models):
  - `docker compose exec backend dotnet tool restore || true`
  - `docker compose exec backend dotnet ef database update`

## Roadmap (milestones)

- M0: Infrastructure & skeleton
  - Compose up with MySQL + Redis healthy, backend reachable on 8080, frontend on 5173.
  - Add CORS to backend to allow frontend origin.

- M1: Backend foundation (.NET 8 WebAPI)
  - Entities: User, Incident (+ basic status/severity fields).
  - EF Core setup, migrations, MySQL provider, connection string from env.
  - Health endpoint `/health`, Swagger, basic error handling.

- M2: Auth & Users
  - JWT auth, password hashing, role-based authorization (Admin/User).
  - Endpoints: register (admin only), login, get profile, list/create/update/delete users (admin).

- M3: Incidents
  - CRUD endpoints, filtering, pagination.
  - Escalation rules scaffold (severity/time-based), status transitions.

- M4: Frontend pages
  - Login, Dashboard, Incident Management, User Management, Settings.
  - API client, global error handling, protected routes.

- M5: Logging & observability
  - Structured logging to console + Redis (e.g., Serilog + StackExchange.Redis).
  - Request/response logging, correlation IDs, basic metrics.

- M6: Quality & delivery
  - Unit/integration tests, seed admin user.
  - CI (build, test) and Docker image build; optional CD.

- M7: Hardening & polish
  - Secrets management, rate limiting, input validation.
  - Backup strategy for MySQL, retention for logs.
