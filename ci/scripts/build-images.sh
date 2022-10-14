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
DOCKER_VERSION="$(docker --version)"
DOCKER_BUILDX_VERSION="$(docker buildx version)"

# Default
REGISTRY="docker.io"
PUSH="--load"
TAGS="latest"
PLATFORMS="linux/`uname -m`"


# Declare script helper
TEXT_HELPER="\nThis script aims to build docker images for the whole git project with automatic detection.
Following flags are available:

  -a    Comma separated list of OS Arch used as target to build matrix, also known as platforms (e.g: 'linux/amd64,linux/arm64')
        Default is the operating system running the script '$PLATFORMS'

  -f    Docker-compose file used to build matrix

  -m    Matrix used to build images

  -p    Push the image to a registry after performing a local build
        Default is local build only

  -r    Registry host used to build matrix if not passed as argument
        This is also used for registry connection
        Default is '$REGISTRY'

  -s    Registry secret used to push images

  -t    Comma separated list of docker tags used to build matrix (e.g: '1.2.3,latest,next')
        Default is '$TAGS'

  -u    Registry username used to push images

  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts ha:f:m:pr:s:t:u: flag
do
  case "${flag}" in
    a)
      PLATFORMS="${OPTARG}";;
    f)
      COMPOSE_FILE="${OPTARG}";;
    m)
      MATRIX="${OPTARG}";;
    p)
      PUSH="--push";;
    r)
      REGISTRY="${OPTARG}";;
    s)
      REGISTRY_SECRET="${OPTARG}";;
    t)
      TAGS="${OPTARG}";;
    u)
      REGISTRY_USERNAME="${OPTARG}";;
    h | *)
      print_help
      exit 0;;
  esac
done


# Script condition
if [ ! -f "$(readlink -f $COMPOSE_FILE)" ] && [ -z "$MATRIX" ]; then
  echo "\nDocker compose file $COMPOSE_FILE does not exist and no matrix where passed as argument."
  print_help
  exit 1
fi


if [ -z "$MATRIX" ]; then
  # Settings
  printf "\nScript settings:
    -> docker tag: $DOCKER_VERSION
    -> docker buildx tag: $DOCKER_BUILDX_VERSION
    -> docker compose file: $(readlink -f $COMPOSE_FILE)
    -> registry: $REGISTRY
    -> arch (platforms): $PLATFORMS
    -> push: $PUSH
    -> tags: $TAGS\n"

  # Build matrix
  printf "\n${red}${i}.${no_color} Build images matrix\n"
  i=$(($i + 1))

  MATRIX="$($PROJECT_DIR/ci/scripts/build-matrix.sh \
    -f $(readlink -f $COMPOSE_FILE) \
    -p $PLATFORMS \
    -r $REGISTRY \
    -t $TAGS)"

  printf "\nMatrix: $MATRIX\n"
else
  # Settings
  printf "\nScript settings:
    -> docker version: $DOCKER_VERSION
    -> docker buildx version: $DOCKER_BUILDX_VERSION
    -> registry: $REGISTRY
    -> push: $PUSH
    -> matrix: $MATRIX\n"
fi

# Build images
printf "\n${red}${i}.${no_color} Build images\n"
i=$(($i + 1))

cd $PROJECT_DIR

if [ ! "$(docker buildx inspect cross-platform-build)" ]; then
  printf "\n${red}${i}.${no_color} Setup buildx\n"
  i=$(($i + 1))

  docker buildx create \
    --use \
    --name cross-platform-build \
    --platform linux/amd64,linux/arm64 \
    --driver docker-container \
    --driver-opt network=host
fi


if [ ! -z "$REGISTRY_USERNAME" ] && [ ! -z "$REGISTRY_SECRET" ]; then
  printf "\n${red}${i}.${no_color} Login to registry: $REGISTRY\n"
  i=$(($i + 1))

  echo "$REGISTRY_SECRET" | docker login "$REGISTRY" --username "$REGISTRY_USERNAME" --password-stdin
fi


echo "$MATRIX" | jq -c '. | .[]' | while read i; do
  echo "$i" | jq -r '.build.tags[]' | while read t; do
    docker buildx build \
      --file "$(echo $i | jq -r '.build.dockerfile')" \
      $PUSH \
      --platform "$(echo $i | jq -r '.build.platforms')" \
      --rm \
      --tag "$t" \
      --target "$(echo $i | jq -r '.build.target')" \
      "$(echo $i | jq -r '.build.context')"
  done
done

if [ ! -z "$REGISTRY_USERNAME" ] && [ ! -z "$REGISTRY_SECRET" ]; then
  printf "\n${red}${i}.${no_color} Logout to registry: $REGISTRY\n"
  i=$(($i + 1))

  docker logout $REGISTRY
fi
