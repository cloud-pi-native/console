FROM cypress/included:12.3.0

RUN npm install --global pnpm

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/client/package*.json ./apps/client/
COPY packages/shared/ ./packages/shared/
COPY packages/test-utils/ ./packages/test-utils/

RUN pnpm install


ENTRYPOINT [ "pnpm", "--filter", "client", "run" ]
CMD [ "cypress:run" ]
