# Dev stage
FROM node:lts as dev

WORKDIR /app

COPY package*.json ./
RUN npm ci


COPY index.html vite.config.js vitest-setup.js ./
COPY public ./public
COPY src ./src

RUN chown -R node /app/node_modules
USER node
CMD [ "npm", "run", "dev" ]


# Build stage
FROM dev as build

USER root
RUN npm run build


# Prod stage
FROM nginx:stable as prod

COPY --from=build /app/dist /usr/share/nginx/html/
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf