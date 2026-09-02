# Padharo customer web (Next.js 16, `next start`)
#
# IMPORTANT: NEXT_PUBLIC_* values are inlined into the client bundle at
# `next build` time, so they are passed as build ARGs (from docker-compose
# build.args -> deploy/padharo.env). Changing the API URL requires a rebuild,
# not just a restart.
FROM node:20.16.0-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_WS_SERVER_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL \
    NEXT_PUBLIC_WS_SERVER_URL=$NEXT_PUBLIC_WS_SERVER_URL \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
