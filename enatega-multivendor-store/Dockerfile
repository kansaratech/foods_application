# Padharo Store (merchant app) — Expo web static export, served by nginx.
#
# For end-to-end testing on the server: padharo-store.kansaratech.com
# The API URL is inlined at export time via EXPO_PUBLIC_* build ARGs
# (docker-compose build.args -> deploy/padharo.env). Changing it needs a rebuild.

FROM node:20.16.0-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_GRAPHQL_URL
ARG EXPO_PUBLIC_WS_GRAPHQL_URL
ENV EXPO_PUBLIC_GRAPHQL_URL=$EXPO_PUBLIC_GRAPHQL_URL \
    EXPO_PUBLIC_WS_GRAPHQL_URL=$EXPO_PUBLIC_WS_GRAPHQL_URL \
    NODE_ENV=production \
    CI=1 \
    EXPO_NO_TELEMETRY=1

RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
