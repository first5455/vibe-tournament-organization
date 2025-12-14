# --- Stage 1: Install Dependencies ---
FROM oven/bun:1 as base
WORKDIR /app

# Copy package files first to cache dependencies
# This speeds up re-builds significantly if you only change code, not packages
COPY package.json bun.lockb ./

# Install production dependencies only
# --frozen-lockfile ensures you get exactly the versions in your lockfile
RUN bun install --frozen-lockfile --production

# --- Stage 2: The Final Image ---
# We use a "distroless" or slim image if possible, but the standard bun image is safest for compatibility
FROM oven/bun:1-slim
WORKDIR /app

# Copy node_modules from the previous stage
COPY --from=base /app/node_modules ./node_modules

# Copy your actual source code
COPY . .

# Set environment to production (many apps optimize themselves when they see this)
ENV NODE_ENV=production

# Expose the port (Change 3000 to 8080 for your backend if needed)
EXPOSE 3000

# The command to start your app
# Replace 'index.ts' with your actual entry file
CMD ["bun", "run", "index.ts"]