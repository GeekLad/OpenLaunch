# Use Node.js 24.10.0 Debian as base image
FROM node:24.10.0-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments for NEXT_PUBLIC_ variables
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_SOLANA_NETWORK
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_QUOTE_TOKEN_MINT
ARG NEXT_PUBLIC_TOKEN_DECIMALS
ARG NEXT_PUBLIC_TOTAL_SUPPLY
ARG NEXT_PUBLIC_INITIAL_PRICE
ARG NEXT_PUBLIC_PRICE_RANGE_MIN
ARG NEXT_PUBLIC_PRICE_RANGE_MAX
ARG NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES
ARG NEXT_PUBLIC_FEE_DECAY_PERIODS
ARG NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE
ARG NEXT_PUBLIC_IPFS_GATEWAY
ARG NEXT_PUBLIC_MAX_IMAGE_SIZE_MB
ARG NEXT_PUBLIC_METADATA_MUTABLE

# Set them as environment variables for Next.js build
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_SOLANA_NETWORK=$NEXT_PUBLIC_SOLANA_NETWORK
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_QUOTE_TOKEN_MINT=$NEXT_PUBLIC_QUOTE_TOKEN_MINT
ENV NEXT_PUBLIC_TOKEN_DECIMALS=$NEXT_PUBLIC_TOKEN_DECIMALS
ENV NEXT_PUBLIC_TOTAL_SUPPLY=$NEXT_PUBLIC_TOTAL_SUPPLY
ENV NEXT_PUBLIC_INITIAL_PRICE=$NEXT_PUBLIC_INITIAL_PRICE
ENV NEXT_PUBLIC_PRICE_RANGE_MIN=$NEXT_PUBLIC_PRICE_RANGE_MIN
ENV NEXT_PUBLIC_PRICE_RANGE_MAX=$NEXT_PUBLIC_PRICE_RANGE_MAX
ENV NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES=$NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES
ENV NEXT_PUBLIC_FEE_DECAY_PERIODS=$NEXT_PUBLIC_FEE_DECAY_PERIODS
ENV NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE=$NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE
ENV NEXT_PUBLIC_IPFS_GATEWAY=$NEXT_PUBLIC_IPFS_GATEWAY
ENV NEXT_PUBLIC_MAX_IMAGE_SIZE_MB=$NEXT_PUBLIC_MAX_IMAGE_SIZE_MB
ENV NEXT_PUBLIC_METADATA_MUTABLE=$NEXT_PUBLIC_METADATA_MUTABLE

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
# Provide dummy IPFS credentials for build time validation
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Use existing node user (uid/gid 1000)
# No need to create a new user as node:1000 already exists in the base image

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown node:node .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown node:node /app/data

# Copy and set up entrypoint script
COPY docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint to handle permissions and switch to node user
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["node", "server.js"]