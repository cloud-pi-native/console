# Base stage
FROM node:lts-bullseye-slim as base

RUN npm install --global pnpm


# Dev stage
FROM base as dev

WORKDIR /app

RUN chown node:node /app
USER node

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/client/package*.json ./apps/client/
COPY --chown=node:node packages/shared/ ./packages/shared/
RUN pnpm install --no-optional

CMD [ "pnpm", "--filter", "client", "run", "dev" ]


# Install stage
FROM base as install

WORKDIR /install

COPY . .
RUN pnpm --filter ./apps/client --prod deploy client


# Build stage
FROM node:lts-bullseye-slim as build

ARG SERVER_HOST
ARG SERVER_PORT
ARG KEYCLOAK_DOMAIN
ARG KEYCLOAK_REALM
ARG KEYCLOAK_CLIENT_ID
ARG KEYCLOAK_REDIRECT_URI

WORKDIR /app

COPY --from=install /install/client .
RUN npm run build


# Prod stage
FROM nginx:stable as prod

COPY --from=build /app/dist /usr/share/nginx/html/
COPY --from=build /app/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
