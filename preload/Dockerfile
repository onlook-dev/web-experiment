# Use the official Bun image
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package.json and bun.lockb (if they exist)
COPY package*.json bun.lock ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY . .

# Expose port 1235
EXPOSE 1235

# Start the server
CMD ["bun", "server/index.ts"] 