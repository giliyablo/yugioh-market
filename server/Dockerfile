# Simple Node.js server with Puppeteer support
FROM node:20-alpine

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

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with integrity check bypass
RUN npm ci --no-audit --no-fund --ignore-scripts || \
    (npm cache clean --force && \
     rm -rf node_modules package-lock.json && \
     npm install --no-audit --no-fund)

# Set environment variables for Puppeteer to use system Chromium
# This prevents Puppeteer from downloading its own Chrome binary
# and uses the Alpine Linux Chromium instead
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]