# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Install dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Create log directory
RUN mkdir -p /var/log/crosslisting

# Set non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app /var/log/crosslisting

USER nodejs

# Expose no ports (worker doesn't need external access)
# EXPOSE none

# Health check (optional - checks if worker is running)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('ioredis').createClient(process.env.REDIS_HOST).ping().then(() => process.exit(0)).catch(() => process.exit(1))"

# Start the worker
CMD ["node", "dist/index.js"]
