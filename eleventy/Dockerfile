# Build and serve with the same Express entry point used outside Docker.
FROM node:20-slim

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to install dependencies separately
COPY package.json package-lock.json ./

# Install the locked dependency graph.
RUN npm ci

# Copy the rest of the Eleventy site files, excluding your content directory
COPY . .

# Build the Eleventy site
RUN npx eleventy

# Expose port 8080 for the server
EXPOSE 8080

# Keep API proxy behavior identical in local and production containers.
CMD ["node", "server.js"]
