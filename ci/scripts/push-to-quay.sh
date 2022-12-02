#!/bin/bash
. ./env/.env
for image in $@ ; do
  docker tag $image $DOCKER_REGISTRY$image
  docker push $DOCKER_REGISTRY$image
done