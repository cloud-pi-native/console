FROM cypress/included:10.3.0

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./

RUN npx browserslist@latest --update-db

USER node
ENTRYPOINT []
CMD [ "npm", "run", "cypress"]