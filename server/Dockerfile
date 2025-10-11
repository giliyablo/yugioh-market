# Production build
FROM node:20-alpine

# Install dumb-init for proper signal handling (commented out for now)
# RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy application code
COPY . .

# Expose port
EXPOSE 80

# Health check (commented out for now)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node healthcheck.js

# Start the application
CMD ["node", "index.js"]