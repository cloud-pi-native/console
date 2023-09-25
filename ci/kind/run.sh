#!/bin/bash

# set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'

# Get versions
DOCKER_VERSION="$(docker --version)"

# Default
SCRIPTPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
HELM_RELEASE_NAME="dso"
HELM_DIRECTORY="./helm"
INTEGRATION_ARG=""
INTEGRATION_ARGS_UTILS=""


# Declare script helper
TEXT_HELPER="\nThis script aims to manage a local kubernetes cluster using Kind also known as Kubernetes in Docker.
Following flags are available:

  -c    Command tu run. Multiple commands can be provided as a comma separated list.
        Available commands are :
          build   - Build and push load into nodes docker compose images.
          create  - Create local registry and kind cluster.
          delete  - Delete local registry and kind cluster.
          dev     - Run application in development mode.
          prod    - Run application in production mode.
          int     - Run application in integration mode (need to combine with 'dev' or 'prod').

  -d    Domains to add in /etc/hosts for local services resolution. Comma separated list. This will require sudo.

  -f    Path to the docker-compose file that will be used with Kind.

  -i    Install kind.

  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hc:d:f:ik: flag; do
  case "${flag}" in
    c)
      COMMAND=${OPTARG};;
    d)
      DOMAINS=${OPTARG};;
    f)
      COMPOSE_FILE=${OPTARG};;
    i)
      INSTALL_KIND=true;;
    k)
      KUBECONFIG_PATH=${OPTARG};;
    h | *)
      print_help
      exit 0;;
  esac
done


# Utils
install_kind() {
  printf "\n\n${red}[kind wrapper].${no_color} Install kind...\n\n"
  if [ "$(uname)" = "Linux" ]; then
    OS=linux
  elif [ "$(uname)" = "Darwin" ]; then
    OS=darwin
  else
    printf "\n\nNo installation available for your system, plese refer to the installation guide\n\n"
    exit 0
  fi

  if [ "$(uname -m)" = "x86_64" ]; then
    ARCH=amd64
  elif [ "$(uname -m)" = "arm64" ] || [ "$(uname -m)" = "aarch64" ]; then
    ARCH=arm64
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

  FORMATED_DOMAINS="$(echo "$DOMAINS" | sed 's/,/\ /g')"
  if [ "$(grep -c "$FORMATED_DOMAINS" /etc/hosts)" -ge 1 ]; then
    printf "\n\n${red}[kind wrapper].${no_color} Services local domains already added to /etc/hosts\n\n"
  else
    sudo sh -c "echo $'\n\n# Kind\n127.0.0.1  $FORMATED_DOMAINS' >> /etc/hosts"

    printf "\n\n${red}[kind wrapper].${no_color} Services local domains successfully added to /etc/hosts\n\n"
  fi
fi


# Deploy cluster with trefik ingress controller
if [[ "$COMMAND" =~ "create" ]]; then
  if [ -z "$(kind get clusters | grep 'kind')" ]; then
    printf "\n\n${red}[kind wrapper].${no_color} Create Kind cluster\n\n"

    kind create cluster --config $SCRIPTPATH/configs/kind-config.yml


    printf "\n\n${red}[kind wrapper].${no_color} Install Traefik ingress controller\n\n"

    helm repo add traefik https://traefik.github.io/charts && helm repo update
    helm upgrade \
      --install \
      --wait \
      --namespace traefik \
      --create-namespace \
      --values $SCRIPTPATH/configs/traefik-values.yml \
      traefik traefik/traefik
  fi
fi


# Change kubeconfig context to kind
kubectl config set-context kind-kind


# Build and load images into cluster nodes
if [[ "$COMMAND" =~ "build" ]]; then
  printf "\n\n${red}[kind wrapper].${no_color} Load images into cluster node\n\n"

  docker compose --file $COMPOSE_FILE build
  kind load docker-image $(cat "$COMPOSE_FILE" \
  | docker run -i --rm mikefarah/yq -o t '.services | map(select(.build) | .image)')
fi


# Clean cluster application resources
if [ "$COMMAND" = "clean" ]; then
  printf "\n\n${red}[kind wrapper].${no_color} Clean cluster resources\n\n"

  helm uninstall $HELM_RELEASE_NAME
  kubectl delete pvc/dso-db-storage-dso-postgres-0
  helm uninstall dso-utils
fi


# Check for integration mode
if [[ "$COMMAND" =~ "int" ]]; then
  source ./env/.env.int
  INTEGRATION_ARGS="--values ./env/dso-values-int.yaml"
  if [ -z "$DEV_KUBECONFIG_PATH" ]; then
    printf "\n\n${red}[kind wrapper].${no_color} DEV_KUBECONFIG_PATH not defined in ./env/.env.int integration will certainly fail\nYou should also check you KUBECONFIG_CTX in ./env/dso-values-int.yaml\n\n"
    exit 1
  fi
  INTEGRATION_ARGS_UTILS="--set keycloak.enabled=false --set integration=true --set-file kubeconfig=$DEV_KUBECONFIG_PATH"
fi


# Deploy application in dev or test mode
if [[ "$COMMAND" =~ "dev" ]]; then
  printf "\n\n${red}[kind wrapper].${no_color} Deploy application in development mode\n\n"

  helm upgrade --install --wait $INTEGRATION_ARGS_UTILS --set-file data="./packages/test-utils/src/imports/data.ts" dso-utils ./ci/helm-utils
  helm upgrade \
    --install \
    --wait \
    --values ./env/dso-values.yaml \
    --values ./env/dso-values-dev.yaml \
    $INTEGRATION_ARGS \
    $HELM_RELEASE_NAME $HELM_DIRECTORY

  for i in $(kubectl get deploy -o name); do 
    kubectl rollout status $i -w --timeout=150s; 
  done
elif [[ "$COMMAND" =~ "prod" ]]; then
  printf "\n\n${red}[kind wrapper].${no_color} Deploy application in production mode\n\n"

  helm upgrade --install --wait $INTEGRATION_ARGS_UTILS --set-file data="./packages/test-utils/src/imports/data.ts" dso-utils ./ci/helm-utils
  helm upgrade \
    --install \
    --wait \
    --values ./env/dso-values.yaml \
    $INTEGRATION_ARGS \
    $HELM_RELEASE_NAME $HELM_DIRECTORY

  for i in $(kubectl get deploy -o name); do 
    kubectl rollout status $i -w --timeout=150s
  done
fi


# Delete cluster
if [ "$COMMAND" = "delete" ]; then
  printf "\n\n${red}[kind wrapper].${no_color} Delete Kind cluster\n\n"

  kind delete cluster
fi
