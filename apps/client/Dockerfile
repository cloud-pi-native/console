# Dev stage
FROM node:lts-bullseye-slim as dev

RUN npm install --global pnpm

WORKDIR /app

RUN chown node:node /app
USER node

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/client/package*.json ./apps/client/
COPY --chown=node:node packages/shared/ ./packages/shared/
RUN pnpm install

CMD [ "pnpm", "--filter", "client", "run", "dev" ]


# Install stage
FROM node:lts-bullseye-slim as install

RUN npm install --global pnpm

WORKDIR /install

COPY . .
RUN pnpm --filter ./apps/client deploy pruned


# Build stage
FROM node:lts-bullseye-slim as build

ARG KEYCLOAK_HOST
ARG KEYCLOAK_PORT
ARG KEYCLOAK_REALM
ARG KEYCLOAK_CLIENTID
ARG SERVER_HOST
ARG SERVER_PORT

WORKDIR /app

COPY --from=install /install/pruned .
RUN npm run build


# Prod stage
FROM nginx:stable as prod

COPY --from=build /app/dist /usr/share/nginx/html/
COPY --from=build /app/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
