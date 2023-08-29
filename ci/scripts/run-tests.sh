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
RUN_UNIT_TESTS="false"
RUN_COMPONENT_TESTS="false"
RUN_E2E_TESTS="false"
RUN_STATUS_CHECK="false"

# Declare script helper
TEXT_HELPER="\nThis script aims to run application tests.
Following flags are available:

  -c    Run component tests

  -e    Run e2e tests

  -u    Run deployement status check

  -u    Run unit tests
  
  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hcesu flag
do
  case "${flag}" in
    c)
      RUN_COMPONENT_TESTS=true;;
    e)
      RUN_E2E_TESTS=true;;
    s)
      RUN_STATUS_CHECK=true;;
    u)
      RUN_UNIT_TESTS=true;;
    h | *)
      print_help
      exit 0;;
  esac
done


# Script condition
if [ "$RUN_UNIT_TESTS" == "false" ] && [ "$RUN_E2E_TESTS" == "false" ] && [ "$RUN_COMPONENT_TESTS" == "false" ] && [ "$RUN_STATUS_CHECK" == "false" ]; then
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
  -> run unit tests: ${RUN_UNIT_TESTS}
  -> run component tests: ${RUN_COMPONENT_TESTS}
  -> run e2e tests: ${RUN_E2E_TESTS}
  -> run deploy status check: ${RUN_STATUS_CHECK}\n"


cd "$PROJECT_DIR"

# Run unit tests
if [ "$RUN_UNIT_TESTS" == "true" ]; then
  npm run test:cov
fi


# Run component tests
if [ "$RUN_COMPONENT_TESTS" == "true" ]; then
  checkDockerRunning

  printf "\n${red}${i}.${no_color} Launch component tests\n"
  i=$(($i + 1))

  npm run test:ct-ci
fi

# Run e2e tests
if [ "$RUN_E2E_TESTS" == "true" ]; then
  checkDockerRunning
  
  printf "\n${red}${i}.${no_color} Launch e2e tests\n"
  i=$(($i + 1))

  npm --prefix $PROJECT_DIR/packages/shared run build
  npm --prefix $PROJECT_DIR/packages/test-utils run build
  npm --prefix $PROJECT_DIR/apps/server run db:wrapper
  npm run kube:init
  npm run kube:prod:build
  npm run kube:prod
  npm run kube:e2e-ci


  printf "\n${red}${i}.${no_color} Remove resources\n"
  i=$(($i + 1))

  npm run kube:delete
fi

# Run e2e tests
if [ "$RUN_STATUS_CHECK" == "true" ]; then
  checkDockerRunning
  
  printf "\n${red}${i}.${no_color} Launch e2e tests\n"
  i=$(($i + 1))

  npm --prefix $PROJECT_DIR/packages/shared run build
  npm --prefix $PROJECT_DIR/packages/test-utils run build
  npm --prefix $PROJECT_DIR/apps/server run db:wrapper
  npm run kube:init
  npm run kube:prod:build
  npm run kube:prod

  for pod in $(kubectl get pod | tail --lines=+2 | awk '{print $1}'); do
    printf "\n${red}Pod:${no_color} ${pod}\n${red}Status:${no_color} $(kubectl get pod/${pod} -o jsonpath='{.status.phase}')\n"
  done

  printf "\n${red}${i}.${no_color} Remove resources\n"
  i=$(($i + 1))

  npm run kube:delete
fi
