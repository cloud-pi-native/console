# Base stage
FROM node:18.12.1-bullseye-slim as base

RUN npm install --global pnpm

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:node apps/client/ ./apps/client/
COPY --chown=node:node packages/shared/ ./packages/shared/


# Dev stage
FROM base as dev

WORKDIR /app

USER node
RUN pnpm install --no-optional

ENTRYPOINT [ "pnpm", "--filter", "client", "run", "dev" ]


# Build stage
FROM base as build

WORKDIR /app

RUN pnpm --filter client --no-optional deploy build && \
  cd build && npm run build


# Prod stage
FROM nginx:1.22.1 as prod

COPY --chown=nginx:nginx --from=build /app/build/dist /usr/share/nginx/html/
COPY --chown=nginx:nginx ./apps/client/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx ./apps/client/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx ./apps/client/nginx/entrypoint.sh /docker-entrypoint.d/load-env.sh
RUN chown -R nginx:nginx /var/cache/nginx && \
  chown -R nginx:nginx /var/log/nginx && \
  chown -R nginx:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid && \
  chown -R nginx:nginx /var/run/nginx.pid
RUN chgrp -R root /var/cache/nginx /var/run /var/log/nginx /var/run/nginx.pid && \
  chmod -R 775 /var/cache/nginx /var/run /var/log/nginx /var/run/nginx.pid
RUN apt install curl 

USER nginx
EXPOSE 8080
