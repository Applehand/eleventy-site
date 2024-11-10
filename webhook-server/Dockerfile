# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies separately
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the entire application code, including .git, to the container
COPY . /usr/src/app

# Expose the port the server will run on
EXPOSE 3001

# Run the webhook server
CMD ["node", "server.js"]
