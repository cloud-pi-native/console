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

# Default
NPM_COMMAND=install
WORKING_DIR="$PWD"

# Declare script helper
TEXT_HELPER="\nThis script aims to install package.json dependencies for the whole git project with automatic detection.
Default installation method is 'npm $NPM_COMMAND'.
Following flags are available:

  -c    Install packages with the command 'npm ci' instead of 'npm install'
        This requires to have both 'package.json' & 'package-lock.json'

  -e    Exclude a directory from being installed
        This argument can be call multiple times if needed

  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hce: flag
do
  case "${flag}" in
    c)
      NPM_COMMAND=ci;;
    e)
      EXCLUDE+=("$(readlink -f ${OPTARG})");;
    h | *)
      print_help
      exit 0;;
  esac
done


# Settings
printf "\nScript settings:
  -> node version: $NODE_VERSION
  -> npm version: $NPM_VERSION
  -> node command: $NPM_COMMAND\n"


# Utils
array_contains () { 
  local array="$1[@]"
  local seeking=$2
  local in=1
  for element in "${!array}"; do
    if [[ $element == "$seeking" ]]; then
      in=0
      break
    fi
  done
  return $in
}


# Install packages
find "$PROJECT_DIR" -type f -name "package.json" ! -path "**/node_modules/*" ! -path "**/.scannerwork/*" \
  | awk '{ print substr( $0, 1, length($0)-13 ) }' \
  | while read d; do
    array_contains EXCLUDE "$(readlink -f $d)" && continue

    printf "\n\n${red}${i}.${no_color} Install nodejs packages for directory: ${red}$d${no_color}\n\n"
    i=$(($i + 1))

    cd "$(readlink -f $d)" && npm "$NPM_COMMAND" && cd "$WORKING_DIR"
  done
