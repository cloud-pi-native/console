#!/bin/bash
for image in $@ ; do
  image=$image
  if [ ! $(docker images inspect $image 2> /dev/null) ]; then
    docker pull $image
  fi

  docker tag $image $QUAY_URL$image
  docker push $QUAY_URL$image
done