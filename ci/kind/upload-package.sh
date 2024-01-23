#!/bin/bash
set -e
dir=$(find . -maxdepth 2 -name "$1" | tail -n 1)
packageName=$(jq -r '.name' "${dir}/package.json")
podName=$(kubectl --context kind-kind get pods -o name | grep server | cut -d "/" -f2)
kubectl --context kind-kind cp "${dir}/dist/" "${podName}:/app/apps/server/node_modules/${packageName}"
echo "$packageName uploaded"