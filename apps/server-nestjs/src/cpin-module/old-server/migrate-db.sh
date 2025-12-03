#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'

# Default
RESET_DB="false"

# DB Values
DB_NAME=dso-console-db
DB_PORT=5432
DB_USER=admin
DB_PASS=admin

# Declare script helper
TEXT_HELPER="\nThis script aims to perform prisma migrations. 

It is needed to export shell variables 'DB_USER', 'DB_PASS', 'DB_PORT' and 'DB_NAME'. Default are :

  DB_USER: $DB_USER
  DB_PASS: $DB_PASS
  DB_NAME: $DB_NAME

Following flags are available:

  -r    Reset the database. Default is "$RESET_DB".
  
  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hr flag
do
  case "${flag}" in
    r)
      RESET_DB=true;;
    h | *)
      print_help
      exit 0;;
  esac
done


# Override database variables for local access
export DB_URL="postgresql://$DB_USER:$DB_PASS@localhost:$DB_PORT/$DB_NAME?schema=public"

# Start database container
printf "\n${red}[db wrapper]${no_color}: Start postgres container\n"
docker run \
  --name postgres-migration \
  --publish $DB_PORT:$DB_PORT \
  --env POSTGRES_USER=$DB_USER \
  --env POSTGRES_PASSWORD=$DB_PASS \
  --env POSTGRES_DB=$DB_NAME \
  --detach \
  postgres

sleep 3

# Start prisma migration
if [ "$RESET_DB" = "true" ]; then
  printf "\n${red}[db wrapper]${no_color}: Start prisma reset\n"
  pnpm --filter @cpn-console/server run db:reset
fi
printf "\n${red}[db wrapper]${no_color}: Start prisma migration\n"
pnpm --filter @cpn-console/server run db:migrate

# Stop database container
printf "\n${red}[db wrapper]${no_color}: Stop and remove postgres container\n"
docker stop postgres-migration
docker rm postgres-migration
