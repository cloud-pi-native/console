#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'

# Get versions
DOCKER_VERSION="$(docker --version)"
DOCKER_BUILDX_VERSION="$(docker buildx version)"

# Declare script helper
TEXT_HELPER="\nThis script aims to delete an image with all its subsequent images in ghcr.
Following flags are available:

  -g    Github token to perform api calls.

  -i    Image name used for api calls.

  -o    Github organization used for api calls.

  -t    Image tage to delete.

  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hg:i:o:t: flag; do
  case "${flag}" in
    g)
      GITHUB_TOKEN=${OPTARG};;
    i)
      IMAGE_NAME=${OPTARG};;
    o)
      ORG=${OPTARG};;
    t)
      TAG=${OPTARG};;
    h | *)
      print_help
      exit 0;;
  esac
done


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
  -> docker version: ${DOCKER_VERSION}
  -> docker buildx version: ${DOCKER_BUILDX_VERSION}\n"


if [ -z "$GITHUB_TOKEN" ] || [ -z "$ORG" ] || [ -z "$IMAGE_NAME" ] || [ -z "$TAG" ]; then
  echo "\nYMissing arguments ...\n"
  print_help
  exit 1
fi

IMAGE_NAME_URL_ENCODED="$(jq -rn --arg x ${IMAGE_NAME} '$x | @uri')"
IMAGES=$(curl -s \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  "https://api.github.com/orgs/${ORG}/packages/container/${IMAGE_NAME_URL_ENCODED}/versions?per_page=100")
MAIN_IMAGE_ID=$(echo "$IMAGES" | jq -r --arg t "$TAG" '.[] | select(.metadata.container.tags[] | contains($t)) | .id')

# Delete subsequent images
while read -r SHA; do
  IMAGE_ID=$(echo "$IMAGES" | jq -r --arg s "$SHA" '.[] | select(.name==$s) | .id')

  printf "\n${red}[Delete ghcr image].${no_color} Deleting subsequent image '$ORG/$IMAGE_NAME@$SHA'\n"

  curl -s \
    -X DELETE \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    "https://api.github.com/orgs/${ORG}/packages/container/${IMAGE_NAME_URL_ENCODED}/versions/${IMAGE_ID}"
done <<< "$(docker buildx imagetools inspect ghcr.io/${ORG}/${IMAGE_NAME}:${TAG} --raw | jq -r '.manifests[] | .digest')"

# Delete main image
printf "\n${red}[Delete ghcr image].${no_color} Deleting image '$ORG/$IMAGE_NAME:$TAG'\n"

curl -s \
  -X DELETE \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  "https://api.github.com/orgs/${ORG}/packages/container/${IMAGE_NAME_URL_ENCODED}/versions/${MAIN_IMAGE_ID}"
