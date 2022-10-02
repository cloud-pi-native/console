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
DOCKER_TAG="$(git rev-parse --short HEAD)"
PUSH="--load"

# Declare script helper
TEXT_HELPER="\nThis script aims to build docker images for the whole git project with automatic detection.
Following flags are available:

  -f    Build docker image(s) with the given docker-compose file

  -p    Push the image to a registry instead of perform a local build
        Default is local build '--load'

  -t    Build image(s) whith the given tag
        Default is last commit short sha ($DOCKER_TAG)

  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hf:pt: flag
do
  case "${flag}" in
    f)
      COMPOSE_FILE="${OPTARG}";;
    p)
      DOCKER_TAG="true";;
    t)
      DOCKER_TAG="${OPTARG}";;
    h | *)
      print_help
      exit 0;;
  esac
done


# Script condition
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "\nDocker compose file $COMPOSE_FILE does not exist."
  print_help
  exit 1
fi


# Settings
printf "\nScript settings:
  -> docker version: $DOCKER_VERSION
  -> docker buildx version: $DOCKER_BUILDX_VERSION
  -> docker compose file: $(readlink -f $COMPOSE_FILE)
  -> docker tag: $DOCKER_TAG\n"


# Build images
printf "\n${red}${i}.${no_color} Launch docker build\n"
i=$(($i + 1))


COMPOSE_FILE="$(readlink -f $COMPOSE_FILE)"
cd "$PROJECT_DIR"

export DOCKER_TAG=$DOCKER_TAG

docker compose \
  --file $COMPOSE_FILE \
  build \
    --pull

if [ "$PUSH" == "true" ]; then
  docker compose \
    --file $COMPOSE_FILE \
    push
fi
