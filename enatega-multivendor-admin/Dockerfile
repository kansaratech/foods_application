# Padharo admin panel (Next.js 14, `next start`)
#
# IMPORTANT: NEXT_PUBLIC_* values are inlined at `next build` time and are
# passed as build ARGs (from docker-compose build.args -> deploy/padharo.env).
FROM node:20.16.0-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_WS_SERVER_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_ADMIN_EMAIL
ARG NEXT_PUBLIC_ADMIN_PASSWORD
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL \
    NEXT_PUBLIC_WS_SERVER_URL=$NEXT_PUBLIC_WS_SERVER_URL \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    NEXT_PUBLIC_ADMIN_EMAIL=$NEXT_PUBLIC_ADMIN_EMAIL \
    NEXT_PUBLIC_ADMIN_PASSWORD=$NEXT_PUBLIC_ADMIN_PASSWORD

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
