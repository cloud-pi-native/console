#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"

# Get versions
NODE_VERSION="$(node --version)"
NPM_VERSION="$(npm --version)"
DOCKER_VERSION="$(docker --version)"
DOCKER_COMPOSE_VERSION="$(docker compose version)"

# Default
ENV_FILE="$PROJECT_DIR/env/.env"

# Declare script helper
TEXT_HELPER="\nThis script aims to run application tests.
Following flags are available:

  -e    Run e2e tests

  -u    Run unit tests for the given directory
        This argument can be call multiple times if needed

  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts heu: flag
do
  case "${flag}" in
    e)
      RUN_E2E_TESTS=true;;
    u)
      UNIT_TESTS_DIRS+=(${OPTARG});;
    h | *)
      print_help
      exit 0;;
  esac
done


# Script condition
if [ ! "$RUN_E2E_TESTS" ] && [ ! "$UNIT_TESTS_DIRS" ]; then
  echo "\nArgument(s) missing, you don't specify any kind of test to run."
  print_help
  exit 0
fi

if [ ! -f "$ENV_FILE" ]; then
  printf "\n${red}Optional.${no_color} Trying to copy file '.env-example' to '.env' because it's missing\n"

  if [ -f "$ENV_FILE-example" ]; then
    cp $ENV_FILE-example $ENV_FILE
    printf "... Successful copying\n"
  else
    printf "... Error while trying to copy, '$ENV_FILE-example' is missing too\n"
    exit 1
  fi
fi


# Settings
printf "\nScript settings:
  -> node version: $NODE_VERSION
  -> npm version: $NPM_VERSION
  -> docker version: $DOCKER_VERSION
  -> docker-compose version: $DOCKER_COMPOSE_VERSION\n"


# Run unit tests
if [ "$UNIT_TESTS_DIRS" ]; then
  for d in "${UNIT_TESTS_DIRS[@]}"; do
    if [ ! -d "$d" ]; then
      printf "\nThe given directory does not exist, skipping unit tests for : ${red}${d}${no_color}.\n"
      continue
    fi

    printf "\n${red}${i}.${no_color} Launch unit tests for directory: ${red}$(readlink -f $d)${no_color}\n"
    i=$(($i + 1))

    cd "$(readlink -f $d)"
    npm run test
    cd $PROJECT_DIR
  done
fi

# Run e2e tests
if [ "$RUN_E2E_TESTS" ]; then
  if [ ! -x "$(command -v docker)" ]; then
    echo "\nThis script uses docker, and it isn't running - please start docker and try again!\n"
    exit 1
  fi
  if [ ! "$DOCKER_COMPOSE_VERSION" ]; then
    echo "\nThis script uses docker compose plugin, and it isn't installed - please install docker compose plugin and try again!\n"
    exit 1
  fi

  printf "\n${red}${i}.${no_color} Launch e2e tests\n"
  i=$(($i + 1))

  cd "$PROJECT_DIR"

  docker compose \
    --file "$PROJECT_DIR/docker/docker-compose.prod.yml" \
    --file "$PROJECT_DIR/docker/docker-compose.e2e.yml" \
    --env-file "$ENV_FILE" up \
      --exit-code-from cypress \
      --attach cypress \
      --remove-orphans \
      --pull always
  
  printf "\n${red}${i}.${no_color} Remove stopped containers\n"
  i=$(($i + 1))

  docker compose \
    --file "$PROJECT_DIR/docker/docker-compose.prod.yml" \
    --file "$PROJECT_DIR/docker/docker-compose.e2e.yml" \
    --env-file "$ENV_FILE" down \
      --volumes
fi
