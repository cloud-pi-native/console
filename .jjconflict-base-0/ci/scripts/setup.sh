#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"

cd "$PROJECT_DIR"


printf "\n${red}${i}.${no_color} Install dependencies\n"
i=$(($i + 1))

pnpm install


printf "\n${red}${i}.${no_color} Generate Prisma client\n"
i=$(($i + 1))

pnpm --filter=server run db:generate


printf "\n${red}${i}.${no_color} Build packges\n"
i=$(($i + 1))

pnpm run build --force


printf "\n${red}${i}.${no_color} Build docker dev images\n"
i=$(($i + 1))

pnpm run docker:dev:build


printf "\n${red}${i}.${no_color} Build docker prod images\n"
i=$(($i + 1))

pnpm run docker:prod:build
