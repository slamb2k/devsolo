# Multi-stage build for han-solo CLI

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Runtime stage
FROM node:20-alpine AS runtime

# Install git (required for han-solo operations)
RUN apk add --no-cache git openssh-client

# Create non-root user
RUN addgroup -g 1001 -S hansolo && \
    adduser -S hansolo -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=hansolo:hansolo /app/dist ./dist
COPY --from=builder --chown=hansolo:hansolo /app/node_modules ./node_modules
COPY --from=builder --chown=hansolo:hansolo /app/package*.json ./
COPY --from=builder --chown=hansolo:hansolo /app/bin ./bin
COPY --from=builder --chown=hansolo:hansolo /app/templates ./templates

# Create necessary directories
RUN mkdir -p /home/hansolo/.hansolo && \
    chown -R hansolo:hansolo /home/hansolo

# Switch to non-root user
USER hansolo

# Set environment variables
ENV NODE_ENV=production
ENV HANSOLO_HOME=/home/hansolo/.hansolo

# Create symlink for global access
RUN npm link

# Set working directory for user projects
WORKDIR /workspace

# Default command
CMD ["hansolo", "--help"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD hansolo --version || exit 1

# Labels
LABEL org.opencontainers.image.title="han-solo"
LABEL org.opencontainers.image.description="Git workflow automation tool enforcing linear history"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="slamb2k"
LABEL org.opencontainers.image.source="https://github.com/slamb2k/hansolo"
LABEL org.opencontainers.image.licenses="MIT"