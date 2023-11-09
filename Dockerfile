# Use the official Node.js image with a tag that includes TypeScript
FROM node:18

# Create a directory for your app
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install dependencies - Note that we're not copying the local node_modules
RUN npm install

# If you are building your code for production
# RUN npm ci --only=production

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# Build the project which will compile the TypeScript files to JavaScript
RUN npm run build

# Your app binds to port 3000 so you'll use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 3000

# Define the command to run your app using CMD which defines your runtime
# Here we will use `forever` to run the compiled JavaScript
CMD [ "npm", "run", "start-forever-process" ]
