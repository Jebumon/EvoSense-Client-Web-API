# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/worker/package*.json ./services/worker/

# Install dependencies
RUN npm ci || npm install

# Copy source files
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/worker ./services/worker

# Build all monorepo packages
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy package descriptors and built artifacts
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/worker/package*.json ./services/worker/

# Install production dependencies only
RUN npm ci --only=production || npm install --only=production

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/worker/dist ./services/worker/dist

# Create persistent data volume directory
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "services/worker/dist/server.js"]
