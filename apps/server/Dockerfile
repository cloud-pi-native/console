# Base stage
FROM node:18.12.1-bullseye-slim as base

RUN npm install --global pnpm


# Dev stage
FROM base as dev

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/server/package*.json ./apps/server/
COPY --chown=node:node packages/shared/ ./packages/shared/
RUN pnpm install

CMD [ "pnpm", "--filter", "server", "run", "dev" ]


# Install stage
FROM base as install

WORKDIR /install

COPY . .
RUN pnpm --filter server --prod deploy server


# Prod stage
FROM node:18.12.1-bullseye-slim as prod

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node --from=install /install/server .

CMD ["npm", "run", "start"]
