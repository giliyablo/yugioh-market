# Simple Node.js server
FROM node:20-alpine

# Set working directory
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

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]
