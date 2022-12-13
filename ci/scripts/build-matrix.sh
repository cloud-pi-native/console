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


# Default
# REGISTRY="docker.io"
TAGS="latest"
COMMIT_SHA="$(git rev-parse --short HEAD)"
PLATFORMS="linux/`uname -m`" # "linux/amd64,linux/arm64"
CSV=false

unset MAJOR_VERSION
unset MINOR_VERSION
unset PATCH_VERSION

# Declare script helper
TEXT_HELPER="\nThis script aims to build matrix for CI/CD. It will parse the given docker-compose file and return a json object with images infos (name, tag, context, dockerfile and if it need to be build)
Following flags are available:

  -c    Use csv list formated output for tags instead of json array

  -f    Docker-compose file used to build matrix

  -p    Target platforms used to build matrix (List/CSV format. ex: 'linux/amd64,linux/arm64')
        Default is '$PLATFORMS'

  -r    Registry host used to build matrix
        Default is '$REGISTRY'

  -t    Docker tag used to build matrix
        Default is '$TAGS'

  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hcf:p:r:t: flag
do
  case "${flag}" in
    c)
      CSV=true;;
    f)
      COMPOSE_FILE=${OPTARG};;
    p)
      PLATFORMS=${OPTARG};;
    r)
      REGISTRY=${OPTARG};;
    t)
      TAGS=${OPTARG};;
    h | *)
      print_help
      exit 0;;
  esac
done


# Script condition
if [ ! -f "$(readlink -f $COMPOSE_FILE)" ]; then
  echo "\nDocker compose file $COMPOSE_FILE does not exist."
  print_help
  exit 1
fi


if [ "$REGISTRY" ] && [[ "$REGISTRY" != */ ]]; then
  REGISTRY="$REGISTRY/"
fi


# Build core matrix
MATRIX=$(cat "$COMPOSE_FILE" \
  | docker run -i --rm mikefarah/yq -o=json \
  | jq \
    --arg d "$(dirname $(readlink -f $COMPOSE_FILE))" \
    --arg p "$PLATFORMS" \
    --arg r "$REGISTRY" \
    --arg t "$TAGS" \
    --arg major "$MAJOR_VERSION" \
    --arg minor "$MINOR_VERSION" \
    '.services | to_entries | map({
      name: (.value.image | split(":")[0]),
      image: (.value.image),
      build: (
        if .value.build then {
          context: ($d + "/" + .value.build.context),
          dockerfile: ($d + "/" + .value.build.context + "/" + .value.build.dockerfile),
          target: (.value.build.target),
          platforms: [],
          tags: []
        } 
        else 
          false 
        end)
      })')

# Add tags in matrix
for t in $(echo $TAGS | tr "," "\n"); do
  if [[ "$t" == *"."*"."* ]]; then
    MAJOR_VERSION="$(echo $t | cut -d "." -f 1)"
    MINOR_VERSION="$(echo $t | cut -d "." -f 2)"
    PATCH_VERSION="$(echo $t | cut -d "." -f 3)"

    MATRIX=$(echo "$MATRIX" \
      | jq \
        --arg r "$REGISTRY" \
        --arg major "$MAJOR_VERSION" \
        --arg minor "$MINOR_VERSION" \
        'map(. |
          if .build != false then 
            .build.tags += [
              ($r + .image + ":" + $major),
              ($r + .image + ":" + $major + "." + $minor)
            ]
          else
            .
          end
        )')
  fi

  MATRIX=$(echo "$MATRIX" \
    | jq \
      --arg t "$t" \
      --arg r "$REGISTRY" \
      'map(. |
        if .build != false then
          .build.tags += [
            ($r + .image + ":" + $t)
          ]
        else
          .
        end
      )')
done

# Add platforms in matrix
for p in $(echo $PLATFORMS | tr "," "\n"); do
  MATRIX=$(echo "$MATRIX" \
    | jq \
      --arg p "$p" \
      'map(. |
        if .build != false then
          .build.platforms += [
            ($p)
          ]
        else
          .
        end
      )')
done

# Update image key with first tag
MATRIX=$(echo "$MATRIX" \
  | jq \
    --arg t "$TAGS" \
    'map(. |
      if .build != false then 
        .image += (":" + ($t | split(",")[0]))
      else
        .
      end
    )')

# Convert tags & platforms from json array to csv list (use join instead of @csv to don't get unwanted quotes)
if [ "$CSV" == "true" ]; then
  MATRIX=$(echo "$MATRIX" \
    | jq -r \
      'map(. |
        if .build != false then 
          .build.tags = (.build.tags | join(",")) |
          .build.platforms = (.build.platforms | join(","))
        else
          .
        end
      )')
fi

echo "$MATRIX" | jq .
