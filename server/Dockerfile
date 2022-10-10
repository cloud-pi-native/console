FROM node:lts as dev

WORKDIR /app

RUN apt-get update \
  && apt-get install -y \
  libcurl4

COPY package*.json ./

RUN npm i

COPY src ./src
COPY dev-setup ./dev-setup

CMD [ "npm", "run", "dev" ]