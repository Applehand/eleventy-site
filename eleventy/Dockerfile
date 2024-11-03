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

# Expose port
EXPOSE 8080

# Start Eleventy development server
CMD ["npx", "eleventy", "--serve", "--port=8080"]
