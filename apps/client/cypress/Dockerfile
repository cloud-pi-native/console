FROM cypress/included:12.3.0

RUN npm install --global pnpm

WORKDIR /app
RUN chown node:node /app

RUN apt-get update -y \
  && apt-get install libpci-dev -y

ENV HOME=/home/node
ENV CYPRESS_CACHE_FOLDER=/root/.cache/Cypress

RUN chmod -R 775 /root/.cache/Cypress \
  && chmod -R 775 /root/.config/Cypress

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/client/package*.json ./apps/client/
COPY --chown=node:node packages/shared/ ./packages/shared/
COPY --chown=node:node packages/test-utils/ ./packages/test-utils/

USER node

RUN pnpm install


ENTRYPOINT [ "pnpm", "--filter", "client", "run" ]
CMD [ "cypress:run" ]
