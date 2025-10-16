FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund --ignore-scripts

# Copy application code
COPY . .

# Expose the port for the health check server
EXPOSE 4000

CMD ["node", "index.js"]
