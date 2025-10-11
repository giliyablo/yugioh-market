# Simple Node.js server
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy application code
COPY . .

# Expose port
EXPOSE 80

# Start the application
CMD ["node", "index.js"]