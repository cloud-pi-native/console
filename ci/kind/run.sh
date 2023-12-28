#!/bin/bash

# set -e

# Colorize terminal
export red='\e[0;31m'
export no_color='\033[0m'

# Get versions
export DOCKER_VERSION="$(docker --version)"

# Default
export SCRIPTPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
export HELM_RELEASE_NAME="dso"
export HELM_DIRECTORY="./helm"
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
          int     - Run application in integration mode (need to combine with 'dev' or 'prod').

  -d    Domains to add in /etc/hosts for local services resolution. Comma separated list. This will require sudo.

  -f    Path to the docker-compose file that will be used with Kind.

  -i    Install kind.

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
      export DEV_KUBECONFIG_PATH=${OPTARG};;
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


# Deploy cluster with trefik ingress controller
if [[ "$COMMAND" =~ "create" ]]; then
  source ./ci/kind/run-create.sh &
  JOB_CREATE="$!"
fi

# Build and load images into cluster nodes
if [[ "$COMMAND" =~ "build" ]]; then
  source ./ci/kind/run-build.sh &
  JOB_BUILD="$!"
fi


# Load images into cluster nodes
if [[ "$COMMAND" =~ "load" ]]; then
  wait $JOB_CREATE
  wait -f $JOB_CREATE $JOB_BUILD
  source ./ci/kind/run-load.sh &
  JOB_LOAD="$!"
  if [[ "$COMMAND" == *load ]]; then
    wait $JOB_LOAD
  fi
fi


# Clean cluster application resources
if [ "$COMMAND" = "clean" ]; then
  printf "\n\n${red}[kind wrapper].${no_color} Clean cluster resources\n\n"

  helm --kube-context kind-kind uninstall $HELM_RELEASE_NAME
  kubectl --context kind-kind delete pvc/dso-db-storage-dso-postgres-0
  helm --kube-context kind-kind uninstall dso-utils
fi


# Check for integration mode
if [[ "$COMMAND" =~ "int" ]]; then
  wait $JOB_LOAD
  source ./env/.env.int
  export INTEGRATION_ARGS="--values ./env/dso-values-int.yaml"
  if [ -z "$DEV_KUBECONFIG_PATH" ]; then
    printf "\n\n${red}[kind wrapper].${no_color} DEV_KUBECONFIG_PATH not defined in ./env/.env.int integration will certainly fail\nYou should also check you KUBECONFIG_CTX in ./env/dso-values-int.yaml\n\n"
    exit 1
  fi
  export INTEGRATION_ARGS_UTILS="--set keycloak.enabled=false --set integration=true --set-file kubeconfig=$DEV_KUBECONFIG_PATH"
fi


# Deploy application in dev or test mode
if [[ "$COMMAND" =~ "dev" ]]; then
  wait $JOB_LOAD -f
  printf "\n\n${red}[kind wrapper].${no_color} Deploy application in development mode\n\n"

  helm --kube-context kind-kind upgrade \
    --install \
    --wait $INTEGRATION_ARGS_UTILS \
    --set-file data="./packages/test-utils/src/imports/data.ts" \
    dso-utils ./ci/helm-utils

  helm --kube-context kind-kind upgrade \
    --install \
    --wait \
    --values ./env/dso-values.yaml \
    --values ./env/dso-values-dev.yaml \
    $INTEGRATION_ARGS \
    $HELM_RELEASE_NAME $HELM_DIRECTORY

  for i in $(kubectl --context kind-kind  get deploy -o name); do 
    kubectl --context kind-kind  rollout status $i -w --timeout=150s; 
  done
elif [[ "$COMMAND" =~ "prod" ]]; then
  wait $JOB_LOAD
  printf "\n\n${red}[kind wrapper].${no_color} Deploy application in production mode\n\n"

  if [ ! -z "$TAG" ]; then
    export CI_ARGS="--set server.container.image=ghcr.io/cloud-pi-native/console/server:$TAG --set client.container.image=ghcr.io/cloud-pi-native/console/client:$TAG --set server.container.imagePullPolicy=Always --set client.container.imagePullPolicy=Always"
  fi

  helm --kube-context kind-kind upgrade \
    --install \
    --wait $INTEGRATION_ARGS_UTILS \
    --set-file data="./packages/test-utils/src/imports/data.ts" \
    dso-utils ./ci/helm-utils

  helm --kube-context kind-kind upgrade \
    --install \
    --wait \
    --values ./env/dso-values.yaml \
    $INTEGRATION_ARGS \
    $CI_ARGS \
    $HELM_RELEASE_NAME $HELM_DIRECTORY

  for i in $(kubectl --context kind-kind get deploy -o name); do 
    kubectl --context kind-kind  rollout status $i -w --timeout=150s
  done
fi


# Delete cluster
if [ "$COMMAND" = "delete" ]; then
  printf "\n\n${red}[kind wrapper].${no_color} Delete Kind cluster\n\n"

  kind delete cluster
fi
