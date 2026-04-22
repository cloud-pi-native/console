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
DOCKER_VERSION="$(docker --version)"
DOCKER_BUILDX_VERSION="$(docker buildx version)"

# Default
RUN_LINT="false"
RUN_UNIT_TESTS="false"
RUN_E2E_TESTS="false"
RUN_STATUS_CHECK="false"

# Declare script helper
TEXT_HELPER="\nThis script aims to run application tests.
Following flags are available:

  -e    Run e2e tests

  -l    Run lint

  -s    Run deployement status check

  -t    (Optional) Tag used for docker images in e2e tests

  -u    Run unit tests

  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts heklst:u flag
do
  case "${flag}" in
    e)
      RUN_E2E_TESTS=true;;
    l)
      RUN_LINT=true;;
    s)
      RUN_STATUS_CHECK=true;;
    t)
      TAG=${OPTARG};;
    u)
      RUN_UNIT_TESTS=true;;
    h | *)
      print_help
      exit 0;;
  esac
done


# Script condition
if [ "$RUN_LINT" == "false" ] && [ "$RUN_UNIT_TESTS" == "false" ] && [ "$RUN_E2E_TESTS" == "false" ] && [ "$RUN_STATUS_CHECK" == "false" ]; then
  printf "\nArgument(s) missing, you don't specify any kind of test to run.\n"
  print_help
  exit 1
fi

if [ "$RUN_E2E_TESTS" == "true" ] && [ -z "$TAG" ]; then
  printf "\nArgument(s) missing, you don't specify the TAG used to pull docker images for e2e tests.\n"
  print_help
  exit 1
fi

checkDockerRunning () {
  if [ ! -x "$(command -v docker)" ]; then
    printf "\nThis script uses docker, and it isn't running - please start docker and try again!\n"
    exit 1
  fi
}

checkBuildxPlugin () {
  if [ ! "$DOCKER_BUILDX_VERSION" ]; then
    printf "\nThis script uses docker buildx plugin, and it isn't installed - please install docker buildx plugin and try again!\n"
    exit 1
  fi
}


# Settings
printf "\nScript settings:
  -> node version: ${NODE_VERSION}
  -> docker version: ${DOCKER_VERSION}
  -> docker buildx version: ${DOCKER_BUILDX_VERSION}
  -> run unit tests: ${RUN_UNIT_TESTS}
  -> run e2e tests: ${RUN_E2E_TESTS}
  -> run deploy status check: ${RUN_STATUS_CHECK}\n"


cd "$PROJECT_DIR"

# Run lint
if [ "$RUN_LINT" == "true" ]; then
    pnpm run lint
fi


# Run unit tests
if [ "$RUN_UNIT_TESTS" == "true" ]; then
    pnpm run test:cov
fi

# Run e2e tests
if [ "$RUN_E2E_TESTS" == "true" ]; then
  checkDockerRunning

  printf "\n${red}${i}.${no_color} Launch e2e tests\n"
  i=$(($i + 1))

    pnpm --prefix $PROJECT_DIR/packages/shared run build
    pnpm --prefix $PROJECT_DIR/packages/test-utils run build

  if [[ -n "$TAG" ]]; then
    docker pull ghcr.io/cloud-pi-native/console/server:$TAG && docker tag ghcr.io/cloud-pi-native/console/server:$TAG dso-console/server:ci
    docker pull ghcr.io/cloud-pi-native/console/server-nestjs:$TAG && docker tag ghcr.io/cloud-pi-native/console/server-nestjs:$TAG dso-console/server-nestjs:ci
    docker pull ghcr.io/cloud-pi-native/console/client:$TAG && docker tag ghcr.io/cloud-pi-native/console/client:$TAG dso-console/client:ci
    docker pull ghcr.io/cloud-pi-native/console/nginx-strangler:$TAG && docker tag ghcr.io/cloud-pi-native/console/client:$TAG dso-console/nginx-strangler:ci
  fi

    pnpm run docker:e2e-ci

  printf "\n${red}${i}.${no_color} Remove resources\n"
  i=$(($i + 1))

    pnpm run docker:e2e-ci:delete
fi
