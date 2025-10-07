# Stage 1: Build the React application
# Use an official Node.js image as the builder environment.
# 'alpine' is a lightweight version of Linux.
FROM node:18-alpine AS build

# Set the working directory inside the container.
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker layer caching.
# This step only re-runs if these files change.
COPY package*.json ./

# Install all project dependencies.
RUN npm install

# Copy the rest of the application source code into the container.
COPY . .

# Build the application for production.
# This creates a 'dist' folder with optimized static files.
RUN npm run build

# Stage 2: Serve the application using Nginx
# Use a lightweight Nginx image for the final production environment.
FROM nginx:stable-alpine

# Copy the custom Nginx configuration file.
# This config is necessary to correctly handle single-page application routing.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files from the 'build' stage to the Nginx public directory.
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to the outside world.
EXPOSE 80

# The default Nginx command will start the web server.
CMD ["nginx", "-g", "daemon off;"]
