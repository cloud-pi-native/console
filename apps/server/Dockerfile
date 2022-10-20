# Dev stage
FROM node:lts-bullseye-slim as dev

RUN npm install --global pnpm

WORKDIR /build

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package*.json ./apps/server/
COPY packages/shared/ ./packages/shared/

RUN pnpm --filter=./apps/server deploy /app

WORKDIR /app

RUN chown node:node /app
USER node

CMD [ "pnpm", "run", "dev" ]


# Install stage
FROM node:lts-bullseye-slim as install

WORKDIR /app

RUN npm install --global pnpm
COPY . .
RUN pnpm --filter=./apps/server --prod deploy pruned


# Prod stage
FROM node:lts-bullseye-slim as prod

WORKDIR /app

RUN chown node:node /app
USER node

COPY --from=install /app/pruned .

CMD ["npm", "run", "start"]
