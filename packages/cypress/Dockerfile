FROM cypress/included:10.11.0

RUN npm install --global pnpm

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/cypress/package*.json ./packages/cypress/
COPY packages/shared/ ./packages/shared/
RUN pnpm install

ENTRYPOINT []
CMD [ "pnpm", "--filter", "cypress", "run", "cypress:run" ]
