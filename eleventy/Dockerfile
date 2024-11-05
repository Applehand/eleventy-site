# eleventy/Dockerfile
FROM node:18

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to install dependencies separately
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the Eleventy site files
COPY . .

# Build the Eleventy site
RUN npx eleventy

# Install a lightweight HTTP server
RUN npm install -g http-server

# Expose port 8080
EXPOSE 8080

# Serve the static files from the build directory (assuming Eleventy outputs to _site)
CMD ["http-server", "_site", "-p", "8080"]
