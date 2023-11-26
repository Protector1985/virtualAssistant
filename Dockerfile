# First stage: Building the application
# Use an official Node.js 18.12 or later runtime as a parent image
FROM node:18 AS build

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock) into the container
COPY package*.json ./

# Install dependencies, including TypeScript
RUN npm install

# Copy your source code into the container
COPY . .

# Build your app (compile TypeScript)
RUN npm run build

# Second stage: Setting up the production environment
# Use a smaller base image for the production build
FROM node:18-slim

# Set the working directory in the production container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock) into the container
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the build from the previous stage
COPY --from=build /usr/src/app/dist ./dist

# Your app binds to port 3000, so you'll use the EXPOSE instruction to have it mapped by the Docker daemon
EXPOSE 3000

# Define the command to run your app
CMD ["npm", "run", "start:prod"]
