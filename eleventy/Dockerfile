# eleventy/Dockerfile
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy Eleventy site files
COPY . .

# Install dependencies
RUN npm install

# Build Eleventy site
RUN npx eleventy

# Expose port
EXPOSE 8080

# Start Eleventy development server
CMD ["npx", "eleventy", "--serve", "--port=8080"]
