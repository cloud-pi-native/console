# Dev stage
FROM node:lts-bullseye-slim as dev

RUN npm install --global pnpm

WORKDIR /app

RUN chown node:node /app
USER node

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/server/package*.json ./apps/server/
COPY --chown=node:node packages/shared/ ./packages/shared/
RUN pnpm install --prod

CMD [ "pnpm", "--filter", "server", "run", "dev" ]


# Install stage
FROM node:lts-bullseye-slim as install

RUN npm install --global pnpm

WORKDIR /install

COPY . .
RUN pnpm --filter=./apps/server --prod deploy server


# Prod stage
FROM node:lts-bullseye-slim as prod

ARG NODE_ENV

WORKDIR /app

COPY --chown=node:node --from=install /install/server .

# RUN chown -R node:node /app
USER node

CMD ["npm", "run", "start"]
