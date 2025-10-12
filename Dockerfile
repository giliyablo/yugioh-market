# Multi-stage build for production
FROM node:18-alpine AS client-builder

# Build client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build

# Server stage
FROM node:18-alpine AS server

# Install Chrome dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Install Puppeteer Chrome browser
RUN npx puppeteer browsers install chrome

# Copy server code
COPY server/ ./

# Copy built client files
COPY --from=client-builder /app/client/dist ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start server
CMD ["node", "index.js"]
