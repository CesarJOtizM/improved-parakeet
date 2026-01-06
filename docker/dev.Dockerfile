FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Create user with same UID/GID as host user to avoid permission issues
# Default to 1000:1000 (most common Linux user IDs)
ARG USER_ID=1000
ARG GROUP_ID=1000

RUN addgroup -g ${GROUP_ID} -S appuser && \
    adduser -S appuser -u ${USER_ID} -G appuser

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Change ownership of app directory to appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Start the application in development mode
CMD ["bun", "run", "dev"]
