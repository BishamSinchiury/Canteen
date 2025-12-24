# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production Stage (This image won't be used directly by Nginx in compose, 
# but the build artifacts will be copied or mounted)
CMD ["echo", "Frontend build complete"]
