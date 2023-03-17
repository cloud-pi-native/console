FROM docker.io/cypress/included:12.6.0

RUN npm install --location=global pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/client/package.json ./apps/client/
COPY packages/shared/ ./packages/shared/
COPY packages/test-utils/ ./packages/test-utils/
COPY patches/ ./patches/
RUN pnpm install
ENTRYPOINT [ "pnpm", "--filter", "client", "run" ]
CMD [ "cypress:run" ]
