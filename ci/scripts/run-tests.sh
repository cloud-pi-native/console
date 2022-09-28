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

# Default arguments
RUN_UNIT_TESTS=false
RUN_E2E_TESTS=false

# Declare script helper
TEXT_HELPER="\nThis script aims to run application tests.

Following flags are available:

  -e, --e2e     Run e2e tests.

  -u, --unit    Run unit tests.

  -h, --help    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts :heu-: flag
do
  case "${flag}" in
    -)
      case "${OPTARG}" in
        e2e)
          RUN_E2E_TESTS=true;;
        unit)
          RUN_UNIT_TESTS=true;;
        help | *)
          print_help
          exit 0;;
      esac;;
    e)
      RUN_E2E_TESTS=true;;
    u)
      RUN_UNIT_TESTS=true;;
    h | *)
      print_help
      exit 0;;
  esac
done

if [ "$RUN_E2E_TESTS" = false ] && [ "$RUN_UNIT_TESTS" = false ]; then
  echo "\nArgument(s) missing, you don't specify any kind of test to run."
  print_help
  exit 0
fi

# Copy env example files
ENV_FILE=cypress/env/.env
if [ ! -f "$PROJECT_DIR/$ENV_FILE" ]; then
  printf "\n${red}Optional.${no_color} Trying to copy file '.env-example' to '.env' because it's missing\n"

  if [ -f "$PROJECT_DIR/$ENV_FILE-example" ]; then
    cp $PROJECT_DIR/$ENV_FILE-example $PROJECT_DIR/$ENV_FILE
    printf "\n${red}Optional.${no_color} Successful copying\n"
  else
    printf "\n${red}Optional.${no_color} Error while trying to copy, '$PROJECT_DIR/$ENV_FILE-example' is missing too\n"
    exit 1
  fi
fi

# Run tests
printf "\nScript settings:
  -> node version: $NODE_VERSION
  -> npm version: $NPM_VERSION
  -> docker version: $DOCKER_VERSION
  -> docker-compose version: $DOCKER_COMPOSE_VERSION\n"

if [ "$RUN_UNIT_TESTS" = true ]; then
  printf "\n${red}${i}.${no_color} Launch unit tests\n"
  i=$(($i + 1))

  cd $PROJECT_DIR
  npm run test:client
fi

if [ "$RUN_E2E_TESTS" = true ]; then
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

  cd $PROJECT_DIR
  npm run test:e2e
fi
