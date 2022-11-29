# Base stage
FROM node:18.12.1-bullseye-slim as base

RUN npm install --global pnpm

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:node apps/server/ ./apps/server/
COPY --chown=node:node packages/shared/ ./packages/shared/
COPY --chown=node:node packages/test-utils/ ./packages/test-utils/


# Dev stage
FROM base as dev

WORKDIR /app

USER node
RUN pnpm install

ENTRYPOINT [ "pnpm", "--filter", "server", "run", "dev" ]


# Build stage
FROM base as build

WORKDIR /app

RUN pnpm --filter server --prod deploy build


# Prod stage
FROM node:18.12.1-bullseye-slim as prod

WORKDIR /app
RUN chown node:node /app

RUN apt-get update && \
  apt-get install python3 python3-pip libsasl2-dev python-dev libldap2-dev libssl-dev git nano -y && \
  apt clean && \
  ln -s /usr/bin/python3 /bin/python3
RUN python3 -m pip install ansible-core==2.13.3 python-ldap python-gitlab requests hvac kubernetes

ENV HOME=/home/node

RUN mkdir /dso
COPY --chown=node:node ./ansible/playbooks/* /dso
COPY --chown=node:node --from=build /app/build .
RUN find /dso -xdev -exec chmod  g=u {} \; -exec chown  :0 {} \;
USER node
RUN ansible-galaxy collection install kubernetes.core community.hashi\_vault community.general

ENTRYPOINT ["node", "src/server.js"]
