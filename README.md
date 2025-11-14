![AlertFrog Logo](assets/AlertFrog_logo.png)

# AlertFrog SIMS

Security Incident Management System (SIMS) scaffold with a TypeScript frontend, .NET 8 WebAPI backend, MySQL/EF Core persistence, and Redis logging—each running as its own Docker service. This README documents the current functionality and how to get the stack running.

## Repository layout

```
backend/    # .NET 8 WebAPI (controller-based)
frontend/   # Vite + React + TypeScript SPA
infra/      # docker-compose.yml, env files, future infra configs
assets/     # Shared assets (logos, etc.)
docs/       # Planning docs (ProjectPlan.md, ProjectStructure.md)
README.md   # This file
```

## Current functionality

### Backend (.NET 8 WebAPI)
- Controller-based template (`WeatherForecastController`) with Swagger/OpenAPI enabled at `/` for all environments.
- Ready for JWT auth, EF Core (MySQL), and Redis logging via configuration placeholders in `docker-compose.yml`.
- Development Dockerfile runs `dotnet watch run` for hot reload inside the container.

### Frontend (Vite + React + TS)
- Stock Vite scaffold, configured to run via Docker with live reload (`npm run dev`).
- Environment variable `VITE_API_BASE_URL` injected via compose for API calls.

### Infrastructure
- `infra/docker-compose.yml` launches four services: `mysql`, `redis`, `backend`, `frontend`.
- Health checks for MySQL/Redis gate backend startup.
- `.env.example` documents required environment variables; copy it to `.env` before running compose.

## Running locally

```bash
# 1. Copy env template
cp infra/.env.example infra/.env
# 2. (Optional) edit secrets/ports inside infra/.env
# 3. Start the stack
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build
# 4. Access services
Frontend: http://localhost:5173
Backend & Swagger UI: http://localhost:8080
MySQL: localhost:3306 (credentials from .env)
Redis: localhost:6379
```

To view logs:
```bash
docker compose -f infra/docker-compose.yml logs -f backend
```

## Next steps / roadmap
- Replace sample Weather endpoint with real auth/user/incident controllers.
- Add EF Core DbContext, migrations, seed data, and MySQL schema.
- Implement Redis-backed structured logging and tracing.
- Build frontend pages: Login, Dashboard, Incident Mgmt, User Mgmt, Settings.
- Add CI/CD workflow for linting/tests/image builds.

See `docs/ProjectPlan.md` and `docs/ProjectStructure.md` for the detailed roadmap and architecture plan.
