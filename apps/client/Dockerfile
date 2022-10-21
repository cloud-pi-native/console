# Dev stage
FROM node:lts-bullseye-slim as dev

RUN npm install --global pnpm

WORKDIR /install

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/client/package*.json ./apps/client/
COPY packages/shared/ ./packages/shared/

RUN pnpm --filter=./apps/client deploy /app

WORKDIR /app

RUN chown -R node:node /app
USER node

CMD [ "pnpm", "run", "dev" ]


# Install stage
FROM node:lts-bullseye-slim as install

RUN npm install --global pnpm

WORKDIR /install

COPY . .
RUN pnpm --filter ./apps/client deploy pruned


# Build stage
FROM node:lts-bullseye-slim as build

WORKDIR /app

COPY --from=install /install/pruned .
RUN npm run build


# Prod stage
FROM nginx:stable as prod

COPY --from=build /app/dist /usr/share/nginx/html/
COPY --from=build /app/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
