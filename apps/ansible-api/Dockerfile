# Base stage
FROM node:18.12.1-bullseye-slim as base
RUN npm install --global pnpm
RUN apt-get update && \
    apt-get install python3 python3-pip libsasl2-dev python-dev libldap2-dev libssl-dev git -y && \
    apt clean && \
    ln -s /usr/bin/python3 /bin/python3
RUN python3 -m pip install ansible-core==2.13.3 python-ldap python-gitlab requests hvac kubernetes
USER node
RUN ansible-galaxy collection install kubernetes.core community.hashi\_vault community.general
COPY --chown=node:node apps/ansible-api/playbooks /dso
ENV PLAYBOOK_DIR='/dso/'
ENV KUBECONFIG='/config/.kubeconfig'


# Dev stage
FROM base as dev

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/ansible-api/package*.json ./apps/ansible-api/
COPY --chown=node:node packages/shared/ ./packages/shared/
RUN pnpm install

CMD [ "pnpm", "--filter", "ansible-api", "run", "dev", "--watch"]


# Install stage
FROM base as install

WORKDIR /install

COPY . .
USER root
RUN pnpm --filter ansible-api --prod deploy ansible-api


# Prod stage
FROM base as prod

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node --from=install /install/ansible-api .
USER root
RUN find / -xdev -exec chmod -c g=u {} \; -exec chown -c :0 {} \;
USER 1001

CMD ["pnpm", "run", "start"]
