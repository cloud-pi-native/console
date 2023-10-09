#!/bin/bash

set -e

unset MAJOR_VERSION
unset MINOR_VERSION
unset PATCH_VERSION

# Declare script helper
TEXT_HELPER="\nThis script aims to build docker tags based on image and set of tags.
Following flags are available:

	-i    Image used to create tags.

  -t    Docker tag used to build matrix.
        Default is '$TAGS'.

  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hi:t: flag; do
  case "${flag}" in
    i)
      IMAGE=${OPTARG};;
    t)
      TAGS=${OPTARG};;
    h | *)
      print_help
      exit 0;;
  esac
done


# Script condition
if [ -z "$IMAGE" ] || [ -z "$TAGS" ]; then
  echo "\nArguments missing."
  print_help
  exit 1
fi


for TAG in $(echo $TAGS | tr "," "\n"); do
	if [[ "$TAG" == *"."*"."* ]]; then
		MAJOR_VERSION="$(echo $TAG | cut -d "." -f 1)"
		MINOR_VERSION="$(echo $TAG | cut -d "." -f 1-2)"
    if [ -z "$DOCKER_TAGS" ]; then
      DOCKER_TAGS="$IMAGE:$MAJOR_VERSION,$IMAGE:$MINOR_VERSION,$IMAGE:$TAG"
    else
      DOCKER_TAGS="$DOCKER_TAGS,$IMAGE:$TAG,$IMAGE:$MAJOR_VERSION,$IMAGE:$MINOR_VERSION,$IMAGE:$TAG"
    fi
	else
    if [ -z "$DOCKER_TAGS" ]; then
			DOCKER_TAGS="$IMAGE:$TAG"
    else
			DOCKER_TAGS="$DOCKER_TAGS,$IMAGE:$TAG"
		fi
	fi
done

echo "$DOCKER_TAGS"
