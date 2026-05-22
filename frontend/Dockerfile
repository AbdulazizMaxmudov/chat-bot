# 1. Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the project
RUN npm run dev

# 2. Production Stage
FROM nginx:alpine

# Copy build artifacts
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/admin.html /usr/share/nginx/html/admin.html

# Copy nginx config
COPY nginx.app.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
