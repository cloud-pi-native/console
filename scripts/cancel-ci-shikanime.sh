#!/bin/bash

# Cancel all in_progress and queued runs for user 'shikanime' on workflow 'Continuous Integration'

echo "Cancelling in_progress runs..."
gh run list --workflow "Continuous Integration" --user shikanime --status in_progress --json databaseId --jq '.[].databaseId' | while read -r run_id; do
  echo "Cancelling run $run_id"
  gh run cancel "$run_id"
done

echo "Cancelling queued runs..."
gh run list --workflow "Continuous Integration" --user shikanime --status queued --json databaseId --jq '.[].databaseId' | while read -r run_id; do
  echo "Cancelling run $run_id"
  gh run cancel "$run_id"
done

echo "Done."
