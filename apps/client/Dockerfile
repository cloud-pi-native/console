# Dev stage
FROM node:lts-bullseye-slim as dev

WORKDIR /app

RUN chown node:node /app
USER node

COPY --chown=node:node apps/client/package*.json ./
RUN npm i

CMD [ "npm", "run", "dev" ]


# Install stage
FROM node:lts-bullseye-slim as install

WORKDIR /app

RUN npm install --global pnpm
COPY . .
RUN pnpm --filter ./apps/client deploy pruned


# Build stage
FROM node:lts-bullseye-slim as build

WORKDIR /app

COPY --from=install /app/pruned/ .
RUN npm run build


# Prod stage
FROM nginx:stable as prod

COPY --from=build /app/dist /usr/share/nginx/html/
COPY --from=build /app/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
