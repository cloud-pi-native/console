#!/bin/bash
set -e

# if first arg seems to be a .js file, assume you would like to run it with node 
if [[ "$1" =~ js$ ]]; then
    set -- node "$@"
fi

# assume you want to clone a repo if you pass GIT_REPO var
if [ ! -z "$GIT_REPO" ]; then
  [ ! -d "$CLONE_DIR" ] && mkdir -p "$CLONE_DIR"
  rm "$CLONE_DIR"/* "$CLONE_DIR"/.* -rf || true
  # assume you want to clone with auth if you pass GIT_USER var
  if [ ! -z "$GIT_USER" ]; then
    AUTH="${GIT_USER}:${GIT_TOKEN}@"
  fi
  # assume you want to clone a specific branch if you pass GIT_BRANCH var
  if [ ! -z "$GIT_BRANCH" ]; then
    BRANCH="--branch ${GIT_BRANCH}"
  fi
  git clone https://${AUTH}${GIT_REPO} ${CLONE_DIR} ${BRANCH}
fi
exec "$@"
