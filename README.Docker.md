# BinThere Dashboard — Docker Containerization

### Quick Start with Docker Compose

To build and start the application stack with persistent storage and health monitoring:

```bash
docker compose up --build -d
```

The unified BinThere dashboard & backend API will be available at **http://localhost:3001**.

### Container Health & Persistence

- **Health Check**: Monitored automatically via `/api/health`.
- **Data Persistence**: SQLite database files are stored in the named Docker volume `binthere_data` mounted at `/app/data`.
- **Non-Root Execution**: Runs under the unprivileged `node` user for enhanced runtime security.

### Standalone Docker Build

Build the production multi-stage image directly:

```bash
docker build -t binthere-dashboard:latest .
```

Run the container manually:

```bash
docker run -d --name binthere-app -p 3001:3001 -v binthere_data:/app/data binthere-dashboard:latest
```

### Multi-Platform Builds

For cloud deployment across target CPU architectures (e.g. `linux/amd64` or `linux/arm64`):

```bash
docker buildx build --platform linux/amd64 -t myregistry.com/binthere-dashboard:latest --push .
```