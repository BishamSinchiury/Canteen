FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build the React application
RUN npm run build

FROM nginx:alpine
# Copy the build artifacts
# Note: vite.config.js specifies 'build' as outDir
COPY --from=build /app/build /usr/share/nginx/html

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
