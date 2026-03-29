# =============================================================================
# SMAUG 2.0 TypeScript — Multi-stage Dockerfile
# =============================================================================
# Stage 1: Build
# Stage 2: Production
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for tsc)
RUN npm ci

# Generate the Prisma client
RUN npx prisma generate

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — Production
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

LABEL maintainer="SMAUG 2.0 Team"
LABEL description="SMAUG 2.0 TypeScript MUD Server"

WORKDIR /app

# Create a non-root user
RUN addgroup -S smaug && adduser -S smaug -G smaug

# Copy dependency manifests and install production-only dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# Copy compiled output from the build stage
COPY --from=build /app/dist ./dist/

# Copy world data and public assets
COPY world ./world/
COPY public ./public/

# Set ownership
RUN chown -R smaug:smaug /app

# Switch to non-root user
USER smaug

# Expose the game port
EXPOSE 4000

# Health check — hit the lightweight /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "dist/main.js"]
