FROM node:lts-bullseye-slim as dev

WORKDIR /app

RUN chown node:node /app
USER node

COPY --chown=node:node package*.json ./
RUN npm i

CMD [ "npm", "run", "dev" ]
