#!/bin/ash

git clone https://${GIT_USER}:${GIT_TOKEN}@${GIT_REPO} /opt/share
cd /opt/share
git checkout ${GIT_BRANCH}
exit 0
