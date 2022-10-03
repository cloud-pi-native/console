#!/bin/bash

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"
ACT_DIR="$PROJECT_DIR/ci/act"

# Get Date
NOW=$(date +'%Y-%m-%dT%H-%M-%SZ')

# Default
EVENT_FILE="$ACT_DIR/events/pr_base_main.json"
WORKFLOW_FILE="$ACT_DIR/workflows/test.yml"

# Declare script helper
TEXT_HELPER="\nThis script aims to run CI locally for tests.
Following flags are available:

  -e    (Optional) Event file in './ci/act/events/' that will trigger workflows. e.g: 'pull_request_test.json'
        Default is '$EVENT_FILE'

  -w    (Optional) Workflow file in './ci/act/workflows/' that will be triggered. e.g: 'test.yml'
        Default is '$WORKFLOW_FILE'

  -h    Print script help\n\n"

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
      WORKFLOW_FILE="$(readlink -f ${OPTARG})";;
    h | *)
      print_help
      exit 0;;
  esac
done

# utils
install_act() {
  printf "\n${red}Optional.${no_color} Installs act...\n"
  curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
  echo "\nact version $(act --version) installed\n"
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
if [ ! -f "$WORKFLOW_FILE" ]; then
  echo "\nWorkflow file $WORKFLOW_FILE does not exist."
  print_help
  exit 1
fi


printf "\n${red}${i}.${no_color} Builds docker image use by act to run our application\n\n"
i=$(($i + 1))

cd $ACT_DIR/docker
docker build \
  --tag act/ubuntu:1.0.0 \
  .


printf "\n${red}${i}.${no_color} Displays workflow list\n\n"
i=$(($i + 1))

cd $PROJECT_DIR
EVENT_NAME=$(cat "$EVENT_FILE" | jq -r 'keys | first')
act $EVENT_NAME \
  --workflows $WORKFLOW_FILE \
  --list


printf "\n${red}${i}.${no_color} Displays workflow graph\n\n"
i=$(($i + 1))

act $EVENT_NAME \
  --workflows $WORKFLOW_FILE \
  --graph


printf "\n${red}${i}.${no_color} Runs locally GitHubActions workflow\n\n"
i=$(($i + 1))

cd $PROJECT_DIR
act $EVENT_NAME \
  --platform ubuntu-latest=act/ubuntu:1.0.0 \
  --workflows $WORKFLOW_FILE \
  --eventpath $EVENT_FILE \
  --use-gitignore \
  --artifact-server-path $ACT_DIR/artifacts \
  --env GITHUB_RUN_ID=$NOW \
  --rm \
  --secret REGISTRY_USERNAME=admin \
  --secret REGISTRY_PASSWORD=admin \
  --bind
  # --secret GITHUB_TOKEN=github-token


printf "\n${red}${i}.${no_color} Retrieves artifacts\n\n"
i=$(($i + 1))

if [ -d "$ACT_DIR/artifacts/$NOW" ] && [ -n "$(find $ACT_DIR/artifacts/$NOW -type f -name '*.gz__')" ]; then
  find $ACT_DIR/artifacts/$NOW -type f -name "*.gz__" | while read f; do
    mv -- "$f" "${f%.gz__}.gz"
    gunzip "${f%.gz__}.gz"
  done
fi

if [ -d "$PROJECT_DIR/workflow" ]; then
  printf "\n${red}${i}.${no_color} Remove files added by act\n\n"
  rm -rf "$PROJECT_DIR/workflow"
fi
