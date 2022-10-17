# Dev stage
FROM node:lts-bullseye-slim as dev

WORKDIR /app

RUN chown node:node /app
USER node

COPY --chown=node:node apps/server/package*.json ./
RUN npm i

CMD [ "npm", "run", "dev" ]


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
