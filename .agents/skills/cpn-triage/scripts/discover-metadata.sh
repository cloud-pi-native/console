#!/usr/bin/env bash
# Usage: scripts/discover-metadata.sh OWNER/REPO
# Print every triage-relevant metadata value the repo or its org offers:
# labels, open milestones, projects, assignees, enabled issue types, and org
# issue fields. Triage must only set values that appear here. One section per
# metadata class; a missing section means that class stays empty.
set -euo pipefail

if [[ $# -ne 1 || -z $1 ]]; then
  echo "Error: REPO (OWNER/REPO) is required." >&2
  echo "Usage: scripts/discover-metadata.sh cloud-pi-native/console" >&2
  exit 2
fi

REPO=$1
OWNER=${REPO%/*}

echo "== labels =="
gh label list --repo "$REPO" --limit 200 --json name,description \
  --jq '.[] | "\(.name)\t\(.description // "")"'

echo "== milestones (open) =="
gh api --paginate "repos/$REPO/milestones?state=open" \
  --jq '.[] | "\(.number)\t\(.title)"'

echo "== projects (owner) =="
gh project list --owner "$OWNER" --format json \
  --jq '.projects[] | "\(.number)\t\(.title)"' 2>/dev/null ||
  echo "no accessible projects (needs project scope)"

echo "== assignees =="
gh api --paginate "repos/$REPO/assignees" --jq '.[].login'

echo "== issue types (enabled) =="
gh api --paginate "repos/$REPO/issue-types" \
  --jq '.[] | select(.is_enabled) | .name'

echo "== org issue fields =="
gh api --paginate "orgs/$OWNER/issue-fields" \
  --jq '.[] | "\(.id)\t\(.name)\t\(.data_type)\t\([.options[]?.name] | join(","))"' \
  2>/dev/null || echo "no org issue fields"
