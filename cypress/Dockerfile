FROM cypress/included:10.8.0

WORKDIR /app

RUN chown node:node /app

COPY --chown=node:node package*.json ./
RUN npm i

COPY --chown=node:node . ./
