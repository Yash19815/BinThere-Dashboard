# syntax=docker/dockerfile:1

ARG NODE_VERSION=20-slim

# --- Stage 1: Build Frontend (Client) ---
FROM node:${NODE_VERSION} AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Stage 2: Install Backend Dependencies ---
FROM node:${NODE_VERSION} AS server-builder
WORKDIR /app/server
RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
RUN npm ci --omit=dev

# --- Stage 3: Production Runtime ---
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
  PORT=3001 \
  PROD_DB_DIR=/app/data

WORKDIR /app

# Copy built backend modules and source code
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# Copy built frontend assets
COPY --from=client-builder /app/client/dist ./client/dist

# Create data directory for SQLite persistence and grant non-root permissions
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "http.get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "server/server.js"]



