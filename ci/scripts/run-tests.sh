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
ENV_FILE="$PROJECT_DIR/env/.env.ci"
RUN_UNIT_TESTS="false"
RUN_COMPONENT_TESTS="false"
RUN_E2E_TESTS="false"

# Declare script helper
TEXT_HELPER="\nThis script aims to run application tests.
Following flags are available:

  -c    Run component tests

  -e    Run e2e tests

  -u    Run unit tests
  
  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hceu flag
do
  case "${flag}" in
    c)
      RUN_COMPONENT_TESTS=true;;
    e)
      RUN_E2E_TESTS=true;;
    u)
      RUN_UNIT_TESTS=true;;
    h | *)
      print_help
      exit 0;;
  esac
done


# Script condition
if [ "$RUN_UNIT_TESTS" == "false" ] && [ "$RUN_E2E_TESTS" == "false" ] && [ "$RUN_COMPONENT_TESTS" == "false" ]; then
  printf "\nArgument(s) missing, you don't specify any kind of test to run.\n"
  print_help
  exit 0
fi

checkDockerRunning () {
  if [ ! -x "$(command -v docker)" ]; then
    printf "\nThis script uses docker, and it isn't running - please start docker and try again!\n"
    exit 1
  fi
}

checkComposePlugin () {
  if [ ! "$DOCKER_COMPOSE_VERSION" ]; then
    printf "\nThis script uses docker compose plugin, and it isn't installed - please install docker compose plugin and try again!\n"
    exit 1
  fi
}


# Settings
printf "\nScript settings:
  -> node version: ${NODE_VERSION}
  -> npm version: ${NPM_VERSION}
  -> docker version: ${DOCKER_VERSION}
  -> docker-compose version: ${DOCKER_COMPOSE_VERSION}
  -> env file: ${ENV_FILE}
  -> run unit tests: ${RUN_UNIT_TESTS}
  -> run component tests: ${RUN_COMPONENT_TESTS}
  -> run e2e tests: ${RUN_E2E_TESTS}\n"


# Run unit tests
if [ "$RUN_UNIT_TESTS" == "true" ]; then
  cd "$PROJECT_DIR"
  npm run test
fi


# Run component tests
if [ "$RUN_COMPONENT_TESTS" == "true" ]; then
  checkDockerRunning
  checkComposePlugin

  printf "\n${red}${i}.${no_color} Launch component tests\n"
  i=$(($i + 1))

  cd "$PROJECT_DIR/docker"
  docker compose \
    --file "$PROJECT_DIR/docker/docker-compose.ct.yml" \
    up \
      --exit-code-from cypress \
      --remove-orphans

  printf "\n${red}${i}.${no_color} Remove stopped containers\n"
  i=$(($i + 1))

  docker compose \
    --file "$PROJECT_DIR/docker/docker-compose.ct.yml" \
    down \
      --volumes
fi

# Run e2e tests
if [ "$RUN_E2E_TESTS" == "true" ]; then
  checkDockerRunning
  checkComposePlugin
  
  printf "\n${red}${i}.${no_color} Launch e2e tests\n"
  i=$(($i + 1))

  cd "$PROJECT_DIR/docker"
  docker compose \
    --file "$PROJECT_DIR/docker/docker-compose.ci.yml" \
    up \
      --exit-code-from cypress \
      --attach cypress \
      --remove-orphans

  printf "\n${red}${i}.${no_color} Remove stopped containers\n"
  i=$(($i + 1))

  docker compose \
    --file "$PROJECT_DIR/docker/docker-compose.ci.yml" \
    down \
      --volumes
fi
