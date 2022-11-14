# Base stage
FROM node:18.12.1-bullseye-slim as base

RUN npm install --global pnpm
RUN apt update && apt install -y python3 python3-pip git vim \
  && echo "deb http://ppa.launchpad.net/ansible/ansible/ubuntu focal main" >> /etc/apt/sources.list.d/ansible.list \
  && apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 93C4A3FD7BB9C367 \
  && apt update && apt install -y ansible
ADD https://github.com/dnum-mi/dso-socle/archive/main.tar.gz /tmp/dso-socle.tar.gz
RUN mkdir /dso && tar -C /dso --strip-components=2 -xf /tmp/dso-socle.tar.gz dso-socle-main/provisionning-project/ && rm /tmp/dso-socle.tar.gz


# Dev stage
FROM base as dev

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/server/package*.json ./apps/server/
COPY --chown=node:node packages/shared/ ./packages/shared/
RUN pnpm install

CMD [ "pnpm", "--filter", "server", "run", "dev" ]


# Install stage
FROM base as install

WORKDIR /install

COPY . .
RUN pnpm --filter server --prod deploy server


# Prod stage
FROM base as prod

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node --from=install /install/server .

CMD ["pnpm", "run", "start"]
