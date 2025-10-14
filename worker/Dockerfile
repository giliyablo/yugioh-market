# worker/Dockerfile
FROM node:20-alpine

# Install Chrome dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with integrity check bypass
RUN npm ci --no-audit --no-fund --ignore-scripts || \
    (npm cache clean --force && \
     rm -rf node_modules package-lock.json && \
     npm install --no-audit --no-fund)

# Copy application code
COPY . .

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Expose the port for the health check server
EXPOSE 5000

CMD ["node", "index.js"]
