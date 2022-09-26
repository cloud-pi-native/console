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
NODE_VERSION="$(node --version)"
NPM_VERSION="$(npm --version)"

# Default npm command
NPM_COMMAND=install

# Declare script helper
TEXT_HELPER="\nThis script aims to install package.json dependencies for the whole git project with automatic detection.
Default installation method is 'npm install'.
Following flags are available:
  -c, --ci      Installs packages with the command 'npm ci' instead of 'npm install'.
                This requires to have both 'package.json' & 'package-lock.json'.
  -h, --help    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts :hc-: flag
do
  case "${flag}" in
    -)
      case "${OPTARG}" in
        ci)
          NPM_COMMAND=ci;;
        help | *)
          print_help
          exit 0;;
      esac;;
    c)
      NPM_COMMAND=ci;;
    h | *)
      print_help
      exit 0;;
  esac
done

# Install packages
printf "\nScript settings:
  -> node version: $NODE_VERSION
  -> npm version: $NPM_VERSION
  -> node command: $NPM_COMMAND\n"

cd "$PROJECT_DIR"
find . -type f -name "package.json" -not -path "**/node_modules/*" \
  | awk '{ print substr( $0, 1, length($0)-13 ) }' \
  | while read d; do
    printf "\n\n${red}${i}.${no_color} Install nodejs packages for directory: ${red}$d${no_color}\n\n"
    cd "$d" && npm "$NPM_COMMAND" && cd -
    i=$(($i + 1))
  done