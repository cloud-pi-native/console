#!/bin/bash

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"

cd "$PROJECT_DIR"


printf "\n${red}${i}.${no_color} Remove build\n"
i=$(($i + 1))

pnpm run build:clean


printf "\n${red}${i}.${no_color} Remove node_modules\n"
i=$(($i + 1))

while true; do
  read -p "Do you want to remove node_modules ('rm -rf $PROJECT_DIR/**/node_modules')? " yn
  case $yn in
    [Yy]*)
      for n in $(find $PROJECT_DIR -depth 3 -type d -name node_modules); do
        echo "Delete '$n'"
        rm -rf "$n"
      done
      # find $PROJECT_DIR -type d -name node_modules -delete
      break;;
    [Nn]*)
      echo "\nKeeping node_modules\n"
      break;;
    *)
      echo "\nPlease answer y or n.\n";;
  esac
done


printf "\n${red}${i}.${no_color} Remove docker stuff\n"
i=$(($i + 1))

if docker image inspect dso-console/client:dev > /dev/null 2>&1; then
  docker image rm dso-console/client:dev
fi
if docker image inspect dso-console/client:prod > /dev/null 2>&1; then
  docker image rm dso-console/client:prod
fi
if docker image inspect dso-console/server:dev > /dev/null 2>&1; then
  docker image rm dso-console/server:dev
fi
if docker image inspect dso-console/server:prod > /dev/null 2>&1; then
  docker image rm dso-console/server:prod
fi

if docker volume inspect docker_dso-postgres-data-dev > /dev/null 2>&1; then
  docker volume rm docker_dso-postgres-data-dev
fi
if docker volume inspect docker_dso-postgres-data-integ > /dev/null 2>&1; then
  docker volume rm docker_dso-postgres-data-integ
fi
if docker volume inspect docker_dso-postgres-data-local > /dev/null 2>&1; then
  docker volume rm docker_dso-postgres-data-local
fi
