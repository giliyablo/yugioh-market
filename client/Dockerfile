# Stage 1: Build the React app
FROM node:18-alpine as build
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . ./
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
# You may need to add an nginx.conf file to handle routing
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]