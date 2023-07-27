#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"
COMPOSE_FILE="$PROJECT_DIR/docker/docker-compose.dev.yml"

# Default
RESET_DB="false"

# DB Values
DB_NAME=dso-console-db
DB_PORT=5432
DB_USER=admin
DB_PASS=admin

# Declare script helper
TEXT_HELPER="\nThis script aims to perform prisma migrations.
Following flags are available:

  -e    Environment file to pass to docker-compose file, should contain db variables. Default is "$ENV_FILE".

  -f    Docker compose file to start database. Default is "$COMPOSE_FILE".

  -r    Reset the database. Default is "$RESET_DB".
  
  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts he:f:r flag
do
  case "${flag}" in
    e)
      ENV_FILE=${OPTARG};;
    f)
      COMPOSE_FILE=${OPTARG};;
    r)
      RESET_DB=true;;
    h | *)
      print_help
      exit 0;;
  esac
done


# Override database variables for local access
export DB_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${DB_PORT}/${DB_NAME}?schema=public"

# Start database container
docker compose -f "$COMPOSE_FILE" up -d postgres

sleep 3


# Start prisma migration
if [ "$RESET_DB" = "true" ]; then
  pnpm --filter server run db:reset
fi
pnpm --filter server run db:migrate

# Stop database container
docker compose -f "$COMPOSE_FILE" down -v
