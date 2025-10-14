# worker/Dockerfile
FROM node:20-alpine

# Install dumb-init and Chrome dependencies
RUN apk add --no-cache \
    dumb-init \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund --ignore-scripts

COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 4000

# Use dumb-init to start the application
CMD ["dumb-init", "node", "index.js"]
