FROM docker.io/cypress/included:12.17.1

RUN npm install --location=global pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/client/ ./apps/client/
COPY packages/shared/ ./packages/shared/
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/test-utils/ ./packages/test-utils/
COPY patches/ ./patches/
RUN pnpm install
RUN pnpm --filter shared run build
ENTRYPOINT [ "pnpm", "--filter", "client", "run" ]
CMD [ "cypress:run" ]
