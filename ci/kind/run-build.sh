#!/bin/bash
cd $(dirname "$COMPOSE_FILE") \
  && docker buildx bake --file $(basename "$COMPOSE_FILE") --load \
  && cd - > /dev/null