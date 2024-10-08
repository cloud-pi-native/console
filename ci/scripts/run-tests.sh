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
DOCKER_BUILDX_VERSION="$(docker buildx version)"
KIND_VERSION="$(kind version)"

# Default
RUN_LINT="false"
RUN_UNIT_TESTS="false"
RUN_COMPONENT_TESTS="false"
RUN_E2E_TESTS="false"
RUN_STATUS_CHECK="false"
RUN_E2E_WITH_KUBE="false"

# Declare script helper
TEXT_HELPER="\nThis script aims to run application tests.
Following flags are available:

  -b    (Optional) Browser used for e2e components and tests

  -c    Run component tests

  -e    Run e2e tests

  -k    Run e2e tests with kubernetes

  -l    Run lint

  -s    Run deployement status check

  -t    (Optional) Tag used for docker images in e2e tests

  -u    Run unit tests

  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hb:ceklst:u flag
do
  case "${flag}" in
    b)
      BROWSER=${OPTARG};;
    c)
      RUN_COMPONENT_TESTS=true;;
    e)
      RUN_E2E_TESTS=true;;
    k)
      RUN_E2E_WITH_KUBE=true;;
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
if [ "$RUN_LINT" == "false" ] && [ "$RUN_UNIT_TESTS" == "false" ] && [ "$RUN_E2E_TESTS" == "false" ] && [ "$RUN_COMPONENT_TESTS" == "false" ] && [ "$RUN_STATUS_CHECK" == "false" ]; then
  printf "\nArgument(s) missing, you don't specify any kind of test to run.\n"
  print_help
  exit 1
fi

if [ "$RUN_E2E_TESTS" == "true" ] && [ "$RUN_E2E_WITH_KUBE" == "false" ] && [ -z "$TAG" ]; then
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
  -> npm version: ${NPM_VERSION}
  -> docker version: ${DOCKER_VERSION}
  -> docker buildx version: ${DOCKER_BUILDX_VERSION}
  -> kind version: ${KIND_VERSION}
  -> run unit tests: ${RUN_UNIT_TESTS}
  -> run component tests: ${RUN_COMPONENT_TESTS}
  -> run e2e tests: ${RUN_E2E_TESTS}  (kube: ${RUN_E2E_WITH_KUBE})
  -> run deploy status check: ${RUN_STATUS_CHECK}\n"


cd "$PROJECT_DIR"

# Run lint
if [ "$RUN_LINT" == "true" ]; then
  npm run lint -- --cache-dir=.turbo/cache --log-order=stream
fi


# Run unit tests
if [ "$RUN_UNIT_TESTS" == "true" ]; then
  npm run test:cov -- --cache-dir=.turbo/cache --log-order=stream
fi


# Run component tests
if [ "$RUN_COMPONENT_TESTS" == "true" ]; then
  checkDockerRunning

  printf "\n${red}${i}.${no_color} Launch component tests\n"
  i=$(($i + 1))

  [[ -n "$BROWSER" ]] && BROWSER_ARGS="-- --browser $BROWSER"

  npm run test:ct-ci -- --cache-dir=.turbo/cache --log-order=stream $BROWSER_ARGS
fi


# Run e2e tests
if [ "$RUN_E2E_TESTS" == "true" ]; then
  checkDockerRunning

  printf "\n${red}${i}.${no_color} Launch e2e tests\n"
  i=$(($i + 1))

  [[ -n "$BROWSER" ]] && BROWSER_ARGS="-- --browser $BROWSER"

  npm --prefix $PROJECT_DIR/packages/shared run build
  npm --prefix $PROJECT_DIR/packages/test-utils run build

  if [[ "$RUN_E2E_WITH_KUBE" = "true" ]]; then
    npm run kube:init
    if [[ -n "$TAG" ]]; then
      npm run kube:prod:run -- -t $TAG
    else
      npm run kube:prod
    fi
    npm run kube:e2e-ci -- --cache-dir=.turbo/cache --log-order=stream $BROWSER_ARGS
  else
    if [[ -n "$TAG" ]]; then
      docker pull ghcr.io/cloud-pi-native/console/server:$TAG && docker tag ghcr.io/cloud-pi-native/console/server:$TAG dso-console/server:prod
      docker pull ghcr.io/cloud-pi-native/console/client:$TAG && docker tag ghcr.io/cloud-pi-native/console/client:$TAG dso-console/client:prod
    fi
    npm run docker:e2e-ci -- --cache-dir=.turbo/cache --log-order=stream $BROWSER_ARGS
  fi

  printf "\n${red}${i}.${no_color} Remove resources\n"
  i=$(($i + 1))

  if [[ "$RUN_E2E_WITH_KUBE" = "true" ]]; then
    npm run kube:delete
  else
    npm run docker:e2e-ci:delete
  fi
fi


# Run deployment status check
if [ "$RUN_STATUS_CHECK" == "true" ]; then
  checkDockerRunning

  printf "\n${red}${i}.${no_color} Launch e2e tests\n"
  i=$(($i + 1))

  npm run kube:init
  if [[ -n "$TAG" ]]; then
    npm run kube:prod:run -- -t $TAG
  else
    npm run kube:prod
  fi

  for pod in $(kubectl get pod | tail --lines=+2 | awk '{print $1}'); do
    printf "\nPod: ${pod}\n${red}Status:${no_color} $(kubectl get pod/${pod} -o jsonpath='{.status.phase}')\n"
  done

  printf "\n${red}${i}.${no_color} Remove resources\n"
  i=$(($i + 1))

  npm run kube:delete
fi
