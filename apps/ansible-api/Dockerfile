# Base stage
FROM docker.io/node:18.14.2-bullseye-slim as base

RUN apt-get update -y && \
  apt-get install python3 python3-pip libsasl2-dev python-dev libldap2-dev libssl-dev git -y && \
  apt clean && \
  ln -s /usr/bin/python3 /bin/python3
RUN python3 -m pip install ansible-core==2.13.3 python-ldap python-gitlab requests hvac kubernetes jmespath
RUN ansible-galaxy collection install kubernetes.core community.hashi\_vault community.general

RUN npm install --location=global pnpm

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:node apps/ansible-api/ ./apps/ansible-api/
COPY --chown=node:node packages/shared/ ./packages/shared/
COPY --chown=node:node packages/test-utils/ ./packages/test-utils/
COPY --chown=node:node patches/ ./patches/


# Dev stage
FROM base as dev

WORKDIR /app


RUN mkdir /dso
COPY --chown=node:node ansible/playbooks/* /dso/

USER node
RUN pnpm install

ENTRYPOINT [ "pnpm", "--filter", "ansible-api", "run", "dev"]



# Build stage
FROM base as build

WORKDIR /app

RUN pnpm --filter ansible-api --prod deploy build


# Prod stage
FROM docker.io/node:18.14.2-bullseye-slim as prod

WORKDIR /app
RUN chown node:node /app
ENV HOME=/home/node
ENV PLAYBOOK_DIR=/dso
ENV CLONE_DIR=/dso
RUN apt-get update -y && \
  apt-get install python3 python3-pip libsasl2-dev python-dev libldap2-dev libssl-dev git -y && \
  apt clean && \
  ln -s /usr/bin/python3 /bin/python3
RUN python3 -m pip install ansible-core==2.13.3 python-ldap python-gitlab requests hvac kubernetes jmespath

USER node
RUN ansible-galaxy collection install kubernetes.core community.hashi\_vault community.general
COPY --chown=node:node --from=build /app/build .

USER root
COPY apps/ansible-api/clone.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
RUN mkdir -p /home/node/.ansible/tmp/ && \
  chmod 777 /home/node/.ansible/tmp/

USER node
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
