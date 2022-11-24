FROM cypress/included:11.2.0

RUN npm install --global pnpm

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/client/package*.json ./apps/client/
COPY packages/shared/ ./packages/shared/
RUN pnpm install

ENTRYPOINT []
CMD [ "pnpm", "--filter", "client", "run", "cypress:run" ]
