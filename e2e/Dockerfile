FROM cypress/included:10.3.0

RUN apt-get update && apt-get upgrade -y && \
  apt-get install -y nodejs npm

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./

RUN npx browserslist@latest --update-db


ENTRYPOINT []
CMD [ "npm", "run", "cypress"]