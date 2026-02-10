#!/bin/bash

set -xe
set -o pipefail

# Colorize terminal
export red='\e[0;31m'
export no_color='\033[0m'

# Get versions
export DOCKER_VERSION="$(docker --version)"

# Default
export SCRIPTPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
export HELM_RELEASE_NAME="dso"
export INTEGRATION_ARG=""
export INTEGRATION_ARGS_UTILS=""
export CI_ARGS=""


# Declare script helper
export TEXT_HELPER="\nThis script aims to manage a local kubernetes cluster using Kind also known as Kubernetes in Docker.
Following flags are available:

  -c    Command tu run. Multiple commands can be provided as a comma separated list.
        Available commands are :
          create  - Create kind cluster.
          clean   - Delete images in kind cluster (keep only infra resources and ingress controller).
          delete  - Delete kind cluster.
          build   - Build, push and load docker images from compose file into cluster nodes.
          load    - Load docker images from compose file into cluster nodes.
          dev     - Run application in development mode.
          prod    - Run application in production mode.
          integ     - Run application in integration mode (need to combine with 'dev' or 'prod').

  -d    Domains to add in /etc/hosts for local services resolution. Comma separated list. This will require sudo.

  -f    Path to the docker-compose file that will be used with Kind.

  -i    Install kind.

  -k    Path to the kubeconfig to use.

  -t    Tag used to deploy application images.

  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hc:d:f:ik:t: flag; do
  case "${flag}" in
    c)
      export COMMAND=${OPTARG};;
    d)
      export DOMAINS=${OPTARG};;
    f)
      export COMPOSE_FILE=${OPTARG};;
    i)
      export INSTALL_KIND=true;;
    k)
      export KUBECONFIG_HOST_PATH=${OPTARG};;
    t)
      export TAG=${OPTARG};;
    h | *)
      print_help
      exit 0;;
  esac
done


# Utils
install_kind() {
  printf "\n\n${red}[kind wrapper].${no_color} Install kind...\n\n"
  if [ "$(uname)" = "Linux" ]; then
    export OS=linux
  elif [ "$(uname)" = "Darwin" ]; then
    export OS=darwin
  else
    printf "\n\nNo installation available for your system, plese refer to the installation guide\n\n"
    exit 0
  fi

  if [ "$(uname -m)" = "x86_64" ]; then
    export ARCH=amd64
  elif [ "$(uname -m)" = "arm64" ] || [ "$(uname -m)" = "aarch64" ]; then
    export ARCH=arm64
  fi

  curl -Lo ./kind "https://kind.sigs.k8s.io/dl/v0.20.0/kind-$OS-$ARCH"
  chmod +x ./kind
  mv ./kind /usr/local/bin/kind

  printf "\n\n$(kind --version) installed\n\n"
}

if [ "$INSTALL_KIND" = "true" ] && [ -z "$(kind --version)" ]; then
  install_kind
fi


# Script condition
if [ -z "$(kind --version)" ]; then
  echo "\nYou need to install kind to run this script.\n"
  print_help
  exit 1
fi

if [[ "$COMMAND" =~ "build" ]] && [ ! -f "$(readlink -f $COMPOSE_FILE)" ]; then
  echo "\nDocker compose file $COMPOSE_FILE does not exist.\n"
  print_help
  exit 1
fi


# Add local services to /etc/hosts
if [ ! -z "$DOMAINS" ]; then
  printf "\n\n${red}[kind wrapper].${no_color} Add services local domains to /etc/hosts\n\n"

  export FORMATED_DOMAINS="$(echo "$DOMAINS" | sed 's/,/\ /g')"
  if [ "$(grep -c "$FORMATED_DOMAINS" /etc/hosts)" -ge 1 ]; then
    printf "\n\n${red}[kind wrapper].${no_color} Services local domains already added to /etc/hosts\n\n"
  else
    sudo sh -c "echo $'\n\n# Kind\n127.0.0.1  $FORMATED_DOMAINS' >> /etc/hosts"

    printf "\n\n${red}[kind wrapper].${no_color} Services local domains successfully added to /etc/hosts\n\n"
  fi
fi
