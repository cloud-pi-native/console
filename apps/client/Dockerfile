# Base stage
FROM node:18.12.1-bullseye-slim as base

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
RUN pnpm --filter client --no-optional deploy client


# Build stage
FROM node:18.12.1-bullseye-slim as build

WORKDIR /app


COPY --from=install /install/client .
RUN npm run build


# Prod stage
FROM nginx:1.22.1 as prod

COPY --from=build /app/dist /usr/share/nginx/html/
COPY ./apps/client/nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./apps/client/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY ./apps/client/nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT [ "/entrypoint.sh" ]
