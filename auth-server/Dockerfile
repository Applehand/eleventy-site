# auth-server/Dockerfile
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies first
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the OAuth server will run on
EXPOSE 8081

# Start the OAuth server
CMD ["node", "auth-server.js"]
