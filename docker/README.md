# Docker Deployment for OpenLaunch

This directory contains Docker configuration files for deploying OpenLaunch using containers.

## Files

- `Dockerfile` - Multi-stage Docker build configuration
- `docker-compose.yml` - Docker Compose configuration with all environment variables
- `.env.example` - Example environment variables file

## Build the Docker Image

First, build the Docker image from the project root directory:

```bash
# Build the image
docker build -f docker/Dockerfile -t openlaunch:latest .
```

## Deployment Options

### Option 1: Using Docker Compose (Recommended)

1. **Copy and configure environment variables:**
   ```bash
   cp docker/.env.example docker/.env
   # Edit docker/.env with your actual values
   ```

2. **Build and run with Docker Compose:**
   ```bash
   cd docker
   docker-compose up -d
   ```

3. **Access the application:**
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
  -e DATABASE_URL="file:./data/openlaunch.db" \
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

Most environment variables have sensible defaults. See `docker/.env.example` for the complete list.

## Data Persistence

The SQLite database is stored in `/app/data` inside the container. The Docker configurations mount this as a volume to persist data across container restarts.

## Health Checks

The Docker configuration includes a health check that calls `/api/init` to verify the application is running properly.

## Production Considerations

1. **Database Backups:** Regularly backup the `./data` directory
2. **Environment Security:** Never commit `.env` files with real API keys
3. **Resource Limits:** Consider setting memory and CPU limits in production
4. **Reverse Proxy:** Use nginx or similar for SSL termination and load balancing
5. **Monitoring:** Set up monitoring for the health check endpoint

## Troubleshooting

### Database Issues
If the database isn't found, ensure the data directory is properly mounted and the application has write permissions.

### IPFS Upload Issues
Verify your IPFS service credentials are correctly set in the environment variables.

### Port Conflicts
Change the port mapping if 3000 is already in use:
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