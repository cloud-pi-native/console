# Base stage
FROM docker.io/node:18.14.2-bullseye-slim as base

RUN npm install --location=global pnpm

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:node apps/client/ ./apps/client/
COPY --chown=node:node packages/shared/ ./packages/shared/
COPY --chown=node:node packages/test-utils/ ./packages/test-utils/
COPY --chown=node:node patches/ ./patches/


# Dev stage
FROM base as dev

WORKDIR /app

USER node
RUN pnpm install --no-optional

ENTRYPOINT [ "pnpm", "--filter", "client", "run", "dev" ]


# Build stage
FROM base as build

WORKDIR /app

RUN pnpm --filter client --prod deploy build
WORKDIR /app/build
RUN npm run build


# Prod stage
FROM docker.io/nginx:1.22.1 as prod

COPY --chown=nginx:nginx --from=build /app/build/dist /usr/share/nginx/html/
COPY --chown=nginx:nginx ./apps/client/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx ./apps/client/nginx/default.conf.tpl /default.conf.tpl
COPY --chown=nginx:nginx ./apps/client/nginx/entrypoint.sh /docker-entrypoint.d/load-env.sh
RUN touch /var/run/nginx.pid 
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run/nginx.pid /etc/nginx/conf.d 
RUN chgrp -R root /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html/assets/ /var/run/nginx.pid /etc/nginx/conf.d && \
  chmod -R 775 /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html/assets/ /var/run/nginx.pid /etc/nginx/conf.d

USER nginx
EXPOSE 8080
