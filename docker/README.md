# Docker Deployment for OpenLaunch

This directory contains Docker configuration files for deploying OpenLaunch using containers.

## Image and Container Information

- **Image name:** `openlaunch:latest`
- **Container name:** `openlaunch`

## Files

- `Dockerfile` - Multi-stage Docker build configuration
- `docker-compose.yml` - Docker Compose configuration with all environment variables
- `docker-entrypoint.sh` - Entrypoint script that handles data directory permissions
- `.env` - Environment variables configuration file

## Build the Docker Image

You can build the Docker image using either Docker Compose or Docker directly:

```bash
# Using Docker Compose (recommended)
cd docker
docker-compose build

# Or using Docker directly from the project root
docker build -f docker/Dockerfile -t openlaunch:latest .
```

## Deployment Options

### Option 1: Using Docker Compose (Recommended)

1. **Configure environment variables:**
   ```bash
   # Edit docker/.env with your actual values
   # Ensure you set your IPFS credentials (Pinata or Filebase)
   ```

2. **Build and run with Docker Compose:**
   ```bash
   cd docker
   docker-compose up -d
   ```

   **Note:** The data directory will be automatically created and permissions will be handled by the container's entrypoint script.

4. **Access the application:**
   Open http://localhost:3000 in your browser

### Option 2: Using Environment File

1. **Create environment file:**
   ```bash
   cp docker/.env.example .env
   # Edit .env with your actual values
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name openlaunch \
     -p 3000:3000 \
     --env-file .env \
     -v $(pwd)/data:/app/data \
     openlaunch:latest
   ```

### Option 3: Using Environment Variables

```bash
docker run -d \
  --name openlaunch \
  -p 3000:3000 \
  -e NEXT_PUBLIC_APP_NAME="OpenLaunch" \
  -e NEXT_PUBLIC_RPC_URL="https://api.mainnet-beta.solana.com" \
  -e PINATA_API_KEY="your_pinata_api_key" \
  -e PINATA_SECRET_KEY="your_pinata_secret_key" \
  -e DATA_DIR="./data" \
  -e ENABLE_CRON="true" \
  -e NODE_ENV="production" \
  -v $(pwd)/data:/app/data \
  openlaunch:latest
```

## Required Environment Variables

### IPFS Configuration (Required)
You must configure at least one IPFS service:

**Option 1: Pinata**
- `PINATA_API_KEY` - Your Pinata API key
- `PINATA_SECRET_KEY` - Your Pinata secret key

**Option 2: Filebase**
- `FILEBASE_API_KEY` - Your Filebase API key

### Optional Environment Variables

Most environment variables have sensible defaults. See `docker/.env` for the complete list.

## Data Persistence

The SQLite database is stored in `/app/data` inside the container, which is mounted to a directory on your host machine.

### Database Location
- **Host path:** Configured via `DATA_DIR` environment variable (default: `docker/data/openlaunch.db`)
- **Container path:** `/app/data/openlaunch.db`

You can customize the data directory by setting `DATA_DIR` in your `.env` file:
```bash
# In docker/.env
DATA_DIR=/custom/path/to/data
```

**Note:** When using Docker Compose, `DATA_DIR` controls the host-side mount path. The path is relative to the docker-compose.yml file location unless you specify an absolute path.

### Backup and Restore

To backup your database:
```bash
# From the docker directory
cp data/openlaunch.db data/openlaunch-backup-$(date +%Y%m%d-%H%M%S).db
```

To restore a database:
```bash
# From the docker directory
cp data/openlaunch-backup.db data/openlaunch.db
```

### Permissions
The container automatically handles data directory permissions through an entrypoint script:
- The container starts as root to fix permissions if needed
- The entrypoint script changes ownership of `/app/data` to the `node` user (uid 1000)
- The container then switches to the `node` user before starting the application

This ensures the database can be created and accessed properly, even when Docker Compose creates the directory as root.

## Health Checks

The Docker configuration includes a health check that calls `/api/init` to verify the application is running properly.

## Production Considerations

1. **Database Backups:** Regularly backup the `docker/data` directory
2. **Environment Security:** Never commit `.env` files with real API keys
3. **Resource Limits:** Consider setting memory and CPU limits in production
4. **Reverse Proxy:** Use nginx or similar for SSL termination and load balancing
5. **Monitoring:** Set up monitoring for the health check endpoint
6. **Data Directory:** Ensure the `docker/data` directory is included in your backup strategy and excluded from version control

## Troubleshooting

### Database Issues
- **Permission Errors:** The entrypoint script automatically fixes permissions. If you still encounter issues:
  - Check that the container has permission to modify the mounted directory
  - Verify the container logs: `docker logs openlaunch`
  - Look for the message `[Entrypoint] Fixing permissions on /app/data directory...`
- **Database Not Found:** The database is automatically created on first run if it doesn't exist
- **Initialization Failures:** Check container logs with `docker logs openlaunch` or `docker compose -f docker/docker-compose.yml logs`

### IPFS Upload Issues
Verify your IPFS service credentials are correctly set in the environment variables.

### Port Conflicts
If port 3000 is already in use, change the port mapping in [docker-compose.yml](docker-compose.yml):
```yaml
ports:
  - "8080:3000"  # Change host port to 8080
```

Or if using `docker run`:
```bash
docker run -p 8080:3000 openlaunch:latest
```

## Development with Docker

For development, you can mount the source code and use hot reloading:

```bash
docker run -d \
  --name openlaunch-dev \
  -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  -v /app/.next \
  --env-file .env \
  openlaunch:latest \
  npm run dev
```

Note: This requires additional configuration and is not recommended for production deployments.