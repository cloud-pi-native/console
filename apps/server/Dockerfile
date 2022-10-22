# Dev stage
FROM node:lts-bullseye-slim as dev

RUN npm install --global pnpm

WORKDIR /app

RUN chown node:node /app
USER node

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/server/package*.json ./apps/server/
COPY --chown=node:node packages/shared/ ./packages/shared/
RUN pnpm install

CMD [ "pnpm", "--filter", "server", "run", "dev" ]


# Install stage
FROM node:lts-bullseye-slim as install

RUN npm install --global pnpm

WORKDIR /install

COPY . .
RUN pnpm --filter=./apps/server --prod deploy pruned


# Prod stage
FROM node:lts-bullseye-slim as prod

WORKDIR /app

COPY --from=install /install/pruned .

RUN chown -R node:node /app
USER node

CMD ["npm", "run", "start"]
