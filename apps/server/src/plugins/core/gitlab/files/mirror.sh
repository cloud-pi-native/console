#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Declare script helper
TEXT_HELPER="\nThis script aims to send a request through DSO api to trigger pipelines.


Following flags are available:

  -g  GitLab trigger token

  -k  Api manager consummer key.

  -s  Api manager consummer secret.

  -h  Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts :hg:k:s: flag
do
  case "${flag}" in
    g)
      GITLAB_TRIGGER_TOKEN=${OPTARG};;
    k)
      CONSUMER_KEY=${OPTARG};;
    s)
      CONSUMER_SECRET=${OPTARG};;
    h | *)
      print_help
      exit 0;;
  esac
done

if [ -z ${GITLAB_TRIGGER_TOKEN} ] || [ -z ${CONSUMER_KEY} ] || [ -z ${CONSUMER_SECRET} ]; then
  echo "\nArgument(s) missing, you don't specify consumer key, consumer secret and gitlab trigger token."
  print_help
  exit 0
fi

URL="https://ingate.foo-test.org/gitlab/v4/projects/{{ mirror_project.project.id }}/trigger/pipeline?ref=main&token=${GITLAB_TRIGGER_TOKEN}"

printf "$\n${red}${i}.${no_color} Retrieve DSO api access token.\n\n"
i=$(($i + 1))
CONSUMER_CREDENTIALS=$(echo "${CONSUMER_KEY}:${CONSUMER_SECRET}" | tr -d '\n' | base64)

TOKEN=$(curl -k -X POST https://ingate.foo-test.org/oauth2/token \
  -d "grant_type=client_credentials" \
  -H "Authorization: Basic ${CONSUMER_CREDENTIALS}" \
  | sed -e 's,{"access_token":"\([^"]*\)".*,\1,')

printf "\n${red}${i}.${no_color} Send request to DSO api.\n\n"
curl -X POST -H "Authorization: Bearer ${TOKEN}" -H "accept: application/json" "$URL" | jq '.'