FROM docker.io/node:22.13.0-bullseye-slim
WORKDIR /app
COPY ./package.json package.json
RUN npm i
COPY ./migrate.js migrate.js
CMD [ "npm", "start" ]
USER node
