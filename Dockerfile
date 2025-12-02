# Build stage for React frontend (only on amd64)
FROM --platform=$BUILDPLATFORM node:25-alpine AS frontend-build
ARG TARGETPLATFORM
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --omit=dev
COPY client/ ./
# Only build on amd64 to avoid QEMU issues, create empty build dir for ARM64
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
      npm run build; \
    else \
      mkdir -p build && echo "Built on host platform" > build/.placeholder; \
    fi

# Build stage for backend
FROM node:25-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server/ ./server/

# Production stage
FROM node:25-alpine
WORKDIR /app

# Install dumb-init, shadow for user management, and su-exec for user switching
RUN apk add --no-cache dumb-init shadow su-exec

# Copy backend dependencies and code
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/package*.json ./
COPY --from=backend-build /app/server ./server

# Copy frontend build from build stage
COPY --from=frontend-build /app/client ./client

# Create config directory with proper permissions
RUN mkdir -p /config

# Set default PUID and PGID
ENV PUID=1000
ENV PGID=1000
ENV NODE_ENV=production
ENV PORT=3001

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use entrypoint script to handle user switching
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["node", "server/index.js"]
