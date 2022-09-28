# Dev stage
FROM node:lts as dev

WORKDIR /app

RUN chown node:node /app
USER node

COPY --chown=node:node package*.json ./
RUN npm i

CMD [ "npm", "run", "dev" ]

# Build stage
FROM dev as build

COPY --chown=node:node index.html vite.config.js ./
COPY --chown=node:node public ./public
COPY --chown=node:node src ./src

RUN npm run build

# Prod stage
FROM nginx:stable as prod

COPY --from=build /app/dist /usr/share/nginx/html/
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
