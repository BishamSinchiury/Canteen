# Docker Setup Instructions

This project has been fully dockerized with:
- **Backend**: Django running on Gunicorn with WhiteNoise/Nginx support.
- **Frontend**: React (Vite) served by Nginx.
- **Database**: PostgreSQL.
- **Orchestration**: Docker Compose.

## Prerequisites
- Docker Desktop installed on your machine.
- Git.

## How to Run locally

1. Navigate to the project root directory:
   ```bash
   cd "Canteen Project"
   ```

2. Build and run the containers:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: [http://localhost](http://localhost)
   - Backend API: [http://localhost/api/](http://localhost/api/)
   - Admin: [http://localhost/admin/](http://localhost/admin/)

## How to Deploy (Push & Download)

1. **Commit and Push**:
   Push this entire code to your Git repository (GitHub, GitLab, etc.).

2. **Download on another machine**:
   Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd <repository-name>
   ```

3. **Run**:
   ```bash
   docker-compose up --build
   ```

## Notes
- **Database**: A PostgreSQL database is automatically created. Data is persisted in a docker volume `postgres_data`.
- **Static & Media Files**: Static files and media uploads are shared between backend and frontend using docker volumes.
- **Environment Variables**: Update the `environment` section in `docker-compose.yml` for production secrets (e.g., `SECRET_KEY`, `POSTGRES_PASSWORD`).
