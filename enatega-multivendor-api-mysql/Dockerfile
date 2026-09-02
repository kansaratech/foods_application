# Padharo API (GraphQL + WS subscriptions + /uploads static)
# Single-stage on purpose: the image keeps the Prisma CLI + ts-node so
# `docker compose exec api npx prisma db push` and the seed scripts work.
FROM node:20.16.0-bookworm-slim

# Prisma needs OpenSSL at runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 4000
CMD ["node", "dist/index.js"]
