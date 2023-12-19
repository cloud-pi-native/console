#!/bin/bash
printf "\n\n${red}[kind wrapper].${no_color} Load images into cluster node\n\n"

kind load docker-image $(cat "$COMPOSE_FILE" \
  | docker run -i --rm mikefarah/yq -o t '.services | map(select(.build) | .image)') 