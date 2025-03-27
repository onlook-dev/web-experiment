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

# Expose port 8082
EXPOSE 8082

# Start the server
CMD ["bun", "server/index.ts"] 