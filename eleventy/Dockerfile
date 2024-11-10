# Use Node.js as the base image
FROM node:18

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to install dependencies separately
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the Eleventy site files, excluding your content directory
COPY . .

# Build the Eleventy site
RUN npx eleventy

# Install a lightweight HTTP server
RUN npm install -g http-server

# Expose port 8080 for the server
EXPOSE 8080

# Serve the static files from the build directory (assuming Eleventy outputs to _site)
CMD ["http-server", "_site", "-p", "8080"]
