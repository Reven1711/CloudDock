FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY src ./src

# Expose port
EXPOSE 4005

# Start the service
CMD ["node", "src/index.js"]

