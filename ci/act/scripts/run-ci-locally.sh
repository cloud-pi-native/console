#!/bin/bash

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"
ACT_DIR="$PROJECT_DIR/ci/act"
ACT_ENV_FILE="$ACT_DIR/env/.env"
REGISTRY_DIR="$ACT_DIR/docker/registry"

# Get versions
ACT_VERSION="$(act --version)"
DOCKER_VERSION="$(docker --version)"
DOCKER_COMPOSE_VERSION="$(docker compose version)"

# Get Date
NOW=$(date +'%Y-%m-%dT%H-%M-%S')

# Default
EVENT_FILE="$ACT_DIR/events/pr_base_main.json"
START_REGISTRY="false"
WORKFLOW_DIR="$ACT_DIR/workflows/"

# Env & secrets
source $ACT_ENV_FILE

# Declare script helper
TEXT_HELPER="\nThis script aims to run CI locally for tests.
Following flags are available:

  -e    (Optional) Event file in './ci/act/events/' that will trigger workflows. e.g: './ci/act/events/push_base_main.json'.
        Default is '$EVENT_FILE'.

  -r    (Optional) Start a local registry running as a docker container.
        Default is '$START_REGISTRY'.

  -w    (Optional) Workflow directory that will be triggered. e.g: './github/worlflows' or './ci/act/workflows/test'.
        Default is '$WORKFLOW_DIR'.

  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts he:rw: flag; do
  case "${flag}" in
    e)
      EVENT_FILE="$(readlink -f ${OPTARG})";;
    r)
      START_REGISTRY="true";;
    w)
      WORKFLOW_DIR="$(readlink -f ${OPTARG})";;
    h | *)
      print_help
      exit 0;;
  esac
done

# utils
install_act() {
  printf "\n\n${red}Optional.${no_color} Installs act...\n\n"
  curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
  printf "\n\nact version $(act --version) installed\n\n"
}

if [ -z "$(act --version)" ]; then
  while true; do
    read -p "\nYou need act to run this script. Do you wish to install act?\n" yn
    case $yn in
      [Yy]*)
        install_act;;
      [Nn]*)
        exit;;
      *)
        echo "\nPlease answer yes or no.\n";;
    esac
  done
fi


# Script condition
if [ ! -d "$WORKFLOW_DIR" ]; then
  printf "\n\nWorkflow directory '$WORKFLOW_DIR' does not exist.\n\n"
  print_help
  exit 1
fi

# Settings
EVENT_NAME=$(cat "$EVENT_FILE" | jq -r 'keys_unsorted | first')
printf "\n\nScript settings:
  -> act version: ${ACT_VERSION}
  -> docker version: ${DOCKER_VERSION}
  -> docker-compose version: ${DOCKER_COMPOSE_VERSION}
  -> workflows directory: ${WORKFLOW_DIR}
  -> event file: ${EVENT_FILE}
  -> event name: ${EVENT_NAME}\n\n"

cd $PROJECT_DIR

if [ "$START_REGISTRY" = "true" ]; then
  printf "\n\n${red}${i}.${no_color} Create certificate for local registry\n\n"
  i=$(($i + 1))

  openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
    -keyout $REGISTRY_DIR/certs/registry.local.key -out $REGISTRY_DIR/certs/registry.local.crt \
    -subj "/C=FR/ST=France/L=Paris/O=IT/CN=registry.local"


  printf "\n\n${red}${i}.${no_color} Add local certificate for the registry\n\n"
  i=$(($i + 1))

  touch /etc/ssl/certs/registry.local && cat $REGISTRY_DIR/certs/registry.local.crt > /etc/ssl/certs/registry.local


  printf "\n\n${red}${i}.${no_color} Add the registry in docker daemon insecure registries\n\n"
  i=$(($i + 1))

  jq '."insecure-registries" += ["localhost:5555"]' ~/.docker/daemon.json > daemon.tmp \
    && mv daemon.tmp ~/.docker/daemon.json


  printf "\n\n${red}${i}.${no_color} Create credentials for local registry\n\n"
  i=$(($i + 1))

  docker run \
    --rm \
    --entrypoint htpasswd \
    httpd:2 -Bbn "$REGISTRY_USERNAME" "$REGISTRY_SECRET" \
    > "$REGISTRY_DIR/auth/htpasswd"

  printf "\n\n${red}${i}.${no_color} Start local registry\n\n"
  i=$(($i + 1))

  docker compose -f $REGISTRY_DIR/docker-compose.registry.yml --env-file $ACT_ENV_FILE up -d
fi


printf "\n\n${red}${i}.${no_color} Displays workflow list\n\n"
i=$(($i + 1))

act \
  --workflows "$WORKFLOW_DIR" \
  --eventpath "$EVENT_FILE" \
  --list


printf "\n\n${red}${i}.${no_color} Displays workflow graph\n\n"
i=$(($i + 1))

act \
  --workflows "$WORKFLOW_DIR" \
  --eventpath "$EVENT_FILE" \
  --graph


printf "\n\n${red}${i}.${no_color} Runs locally GitHub Actions workflow\n\n"
i=$(($i + 1))

act "$EVENT_NAME" \
  --platform "ubuntu-latest=ghcr.io/this-is-tobi/tools/act-runner:latest" \
  --workflows "$WORKFLOW_DIR" \
  --eventpath "$EVENT_FILE" \
  --use-gitignore \
  --artifact-server-path "$ACT_DIR/artifacts" \
  --env "GITHUB_RUN_ID=$NOW" \
  --env "REGISTRY_HOST=$REGISTRY_HOST" \
  --env "REGISTRY_PORT=$REGISTRY_PORT" \
  --secret REGISTRY_USERNAME=$REGISTRY_USERNAME \
  --secret REGISTRY_SECRET=$REGISTRY_SECRET \
  --rm
  # --bind \


printf "\n\n${red}${i}.${no_color} Retrieves artifacts\n\n"
i=$(($i + 1))

if [ -d "$ACT_DIR/artifacts/$NOW" ] && [ -n "$(find $ACT_DIR/artifacts/$NOW -type f -name '*.gz__')" ]; then
  find "$ACT_DIR/artifacts/$NOW" -type f -name "*.gz__" | while read f; do
    mv -- "$f" "${f%.gz__}.gz"
    gunzip "${f%.gz__}.gz"
  done
fi


if [ "$START_REGISTRY" = "true" ]; then
  printf "\n\n${red}${i}.${no_color} Stop local registry\n\n"
  i=$(($i + 1))

  docker compose -f $REGISTRY_DIR/docker-compose.registry.yml down -v
fi


printf "\n\n${red}${i}.${no_color} Clean up\n\n"
i=$(($i + 1))

cat "$ACT_ENV_FILE" | while read e; do
  [[ "${e:0:1}" == "#" ]] && continue
  unset "$(echo "$e" | cut -d "=" -f 1)"
done
