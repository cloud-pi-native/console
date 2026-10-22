#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"

# Declare script helper
TEXT_HELPER="\nTemporary bridge for the frozen apps/server legacy: copies its .env-example files into .env files.
Remove this script when apps/server is removed from the repository.
Following flags are available:

  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts h flag
do
  case "${flag}" in
    h | *)
      print_help
      exit 0;;
  esac
done


# Temporary bridge for the frozen Fastify legacy only.
# Remove this script when apps/server is removed from the repository.
find "$PROJECT_DIR/apps/server" -type f -name ".env*-example" -print0 | while IFS= read -r -d '' file; do
  target="${file/-example/}"
  if [ ! -f "$target" ]; then
    printf "\n${red}Copy${no_color}: '%s'\n${red}to${no_color}: '%s'\n" "$file" "$target"
    cp "$file" "$target"
  else
    printf "\nFile '%s' already exists\n" "$target"
  fi
done
