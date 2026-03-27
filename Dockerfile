FROM node:20-slim AS base

# Install dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Pokémon data if not already present
RUN if [ ! -f src/data/pokemon-data.json ]; then \
      npx tsx scripts/fetch-pokemon.ts || echo "PokéAPI fetch failed, using fallback data"; \
    fi

RUN npm run build

# Ensure optional dirs/files exist so COPY doesn't fail
RUN mkdir -p /app/public && \
    touch /app/src/data/pokemon-data.json

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy built app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/data/pokemon-data.json ./src/data/pokemon-data.json

# Create data directory for SQLite (will be mounted as volume)
RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "server.js"]
