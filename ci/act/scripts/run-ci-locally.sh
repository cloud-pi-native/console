#!/bin/bash

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"
ACT_DIR="$PROJECT_DIR/ci/act"
ACT_ENV_FILE="$PROJECT_DIR/ci/act/env/.env"
REGISTRY_DIR="$ACT_DIR/docker/registry"

# Get versions
ACT_VERSION="$(act --version)"
DOCKER_VERSION="$(docker --version)"
DOCKER_COMPOSE_VERSION="$(docker compose version)"

# Get Date
NOW=$(date +'%Y-%m-%dT%H-%M-%SZ')

# Default
EVENT_FILE="$ACT_DIR/events/pr_base_main.json"
WORKFLOW_DIR="$ACT_DIR/workflows/"

# Env & secrets
source $ACT_ENV_FILE

# Declare script helper
TEXT_HELPER="\nThis script aims to run CI locally for tests.
Following flags are available:

  -e    (Optional) Event file in './ci/act/events/' that will trigger workflows. e.g: './ci/act/events/push_base_main.json'.
        Default is '$EVENT_FILE'.

  -w    (Optional) Workflow directory that will be triggered. e.g: './github/worlflows' or './ci/act/workflows/test'.
        Default is '$WORKFLOW_DIR'.

  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts he:w: flag
do
  case "${flag}" in
    e)
      EVENT_FILE="$(readlink -f ${OPTARG})";;
    w)
      WORKFLOW_DIR="$(readlink -f ${OPTARG})";;
    h | *)
      print_help
      exit 0;;
  esac
done

# utils
install_act() {
  printf "\n${red}Optional.${no_color} Installs act...\n"
  curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
  printf "\nact version $(act --version) installed\n"
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
  printf "\nWorkflow directory '$WORKFLOW_DIR' does not exist.\n"
  print_help
  exit 1
fi

# Settings
EVENT_NAME=$(cat "$EVENT_FILE" | jq -r 'keys_unsorted | first')
printf "\nScript settings:
  -> act version: ${ACT_VERSION}
  -> docker version: ${DOCKER_VERSION}
  -> docker-compose version: ${DOCKER_COMPOSE_VERSION}
  -> workflows directory: ${WORKFLOW_DIR}
  -> event file: ${EVENT_FILE}
  -> event name: ${EVENT_NAME}\n"



# printf "\n${red}${i}.${no_color} Create credentials for local registry\n\n"
# i=$(($i + 1))

# docker run \
#   --rm \
#   --entrypoint htpasswd \
#   httpd:2 -Bbn "$REGISTRY_USERNAME" "$REGISTRY_SECRET" \
#   > "$REGISTRY_DIR/auth/htpasswd"


printf "\n${red}${i}.${no_color} Start local registry\n\n"
i=$(($i + 1))

docker compose -f ./ci/act/docker/registry/docker-compose.registry.yml up -d


printf "\n${red}${i}.${no_color} Builds docker image use by act as Github runner\n\n"
i=$(($i + 1))

cd $ACT_DIR/docker
docker build \
  --tag "$REGISTRY_HOST/act/ubuntu" \
  .

docker push "$REGISTRY_HOST/act/ubuntu"


printf "\n${red}${i}.${no_color} Displays workflow list\n\n"
i=$(($i + 1))

cd $PROJECT_DIR
act \
  --workflows "$WORKFLOW_DIR" \
  --eventpath "$EVENT_FILE" \
  --list


printf "\n${red}${i}.${no_color} Displays workflow graph\n\n"
i=$(($i + 1))

act \
  --workflows "$WORKFLOW_DIR" \
  --eventpath "$EVENT_FILE" \
  --graph


printf "\n${red}${i}.${no_color} Runs locally GitHub Actions workflow\n\n"
i=$(($i + 1))

cd $PROJECT_DIR
act "$EVENT_NAME" \
  --platform "ubuntu-latest=localhost:6000/act/ubuntu" \
  --workflows "$WORKFLOW_DIR" \
  --eventpath "$EVENT_FILE" \
  --use-gitignore \
  --artifact-server-path "$ACT_DIR/artifacts" \
  --env "GITHUB_RUN_ID=$NOW" \
  --env "REGISTRY_HOST=$REGISTRY_HOST" \
  --rm
  # --bind \
  # --secret REGISTRY_USERNAME=$REGISTRY_USERNAME \
  # --secret REGISTRY_SECRET=$REGISTRY_SECRET


printf "\n${red}${i}.${no_color} Retrieves artifacts\n\n"
i=$(($i + 1))

if [ -d "$ACT_DIR/artifacts/$NOW" ] && [ -n "$(find $ACT_DIR/artifacts/$NOW -type f -name '*.gz__')" ]; then
  find "$ACT_DIR/artifacts/$NOW" -type f -name "*.gz__" | while read f; do
    mv -- "$f" "${f%.gz__}.gz"
    gunzip "${f%.gz__}.gz"
  done
fi


printf "\n${red}${i}.${no_color} Stop local registry\n\n"
i=$(($i + 1))

docker compose -f ./ci/act/docker/registry/docker-compose.registry.yml down -v


printf "\n${red}${i}.${no_color} Clean up\n\n"
i=$(($i + 1))

cat "$ACT_ENV_FILE" | while read e; do
  [[ "${e:0:1}" == "#" ]] && continue
  unset "$(echo "$e" | cut -d "=" -f 1)"
done
