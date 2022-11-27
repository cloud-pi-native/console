# Base stage
FROM node:18.12.1-bullseye-slim as base

RUN npm install --global pnpm

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:node apps/ansible-api/ ./apps/ansible-api/
COPY --chown=node:node packages/shared/ ./packages/shared/
COPY --chown=node:node packages/test-utils/ ./packages/test-utils/


# Dev stage
FROM base as dev

WORKDIR /app

RUN apt-get update && \
	apt-get install python3 python3-pip libsasl2-dev python-dev libldap2-dev libssl-dev git -y && \
	apt clean && \
	ln -s /usr/bin/python3 /bin/python3
RUN python3 -m pip install ansible-core==2.13.3 python-ldap python-gitlab requests hvac kubernetes
RUN ansible-galaxy collection install kubernetes.core community.hashi\_vault community.general

RUN mkdir /dso
COPY --chown=node:node ansible/playbooks/* /dso

USER node
RUN pnpm install

ENTRYPOINT [ "pnpm", "--filter", "ansible-api", "run", "dev"]



# Build stage
FROM base as build

WORKDIR /app

RUN pnpm --filter ansible-api --prod deploy build


# Prod stage
FROM node:18.12.1-bullseye-slim as prod

WORKDIR /app
RUN chown node:node /app

RUN apt-get update && \
	apt-get install python3 python3-pip libsasl2-dev python-dev libldap2-dev libssl-dev git -y && \
	apt clean && \
	ln -s /usr/bin/python3 /bin/python3
RUN python3 -m pip install ansible-core==2.13.3 python-ldap python-gitlab requests hvac kubernetes
RUN ansible-galaxy collection install kubernetes.core community.hashi\_vault community.general

ENV HOME=/home/node

RUN mkdir /dso
COPY --chown=node:node ./ansible/playbooks/* /dso
COPY --chown=node:node --from=build /app/build .

# RUN ls /dso
# RUN find /home/node -xdev -exec chmod -f g=u {} \; -exec chown -f :0 {} \;
USER node

ENTRYPOINT ["node", "src/server.js"]
