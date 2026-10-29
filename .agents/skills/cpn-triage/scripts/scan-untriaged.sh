#!/usr/bin/env bash
# Usage: scripts/scan-untriaged.sh OWNER/REPO
# List open issues and PRs whose triage metadata is incomplete, computed
# against what the repo or its org actually supports. Assignment follows the
# triage doctrine: machine-routable work gets an assignee, human-only work
# stays unassigned — an unassigned item is never a gap. One paginated call
# per repo. Output: TSV number, kind, missing classes.
set -euo pipefail

if [[ $# -ne 1 || -z $1 ]]; then
  echo "Error: REPO (OWNER/REPO) is required." >&2
  echo "Usage: scripts/scan-untriaged.sh cloud-pi-native/console" >&2
  echo "Empty columns emit a literal none sentinel: read -r collapses" >&2
  echo "adjacent empty fields, an all-empty item would parse as complete." >&2
  exit 2
fi

REPO=$1
OWNER=${REPO%/*}

TYPES=$(gh api "repos/$REPO/issue-types" \
  --jq '[.[] | select(.is_enabled)] | length' 2>/dev/null || echo 0)
FIELDS=$(gh api "orgs/$OWNER/issue-fields" --jq 'length' 2>/dev/null || echo 0)
MILESTONES=$(gh api "repos/$REPO/milestones?state=open" \
  --jq 'length' 2>/dev/null || echo 0)

echo "# classes: type=$TYPES fields=$FIELDS milestones=$MILESTONES"

FIELD_NAMES=$(gh api "orgs/$OWNER/issue-fields" --jq '[.[].name] | join(",")' 2>/dev/null || echo "")

gh api --paginate "repos/$REPO/issues?state=open&per_page=100" --jq '.[] | [.number, (if .pull_request then "pr" else "issue" end), (.type.name // "none"), (if ([.labels[].name] | length) == 0 then "none" else ([.labels[].name] | join(",")) end), ([.issue_field_values[]?.issue_field_name] | join(",") | if . == "" then "none" else . end), (.milestone.title // "none")] | @tsv' |
while IFS=$'\t' read -r n kind type labels fields milestone; do
    gaps=""
    if [[ $kind == issue && $TYPES -gt 0 && $type == "none" ]]; then
      gaps+="type,"
    fi
    if [[ $labels == "none" ]]; then
      gaps+="labels,"
    fi
    if [[ $MILESTONES -gt 0 && $milestone == "none" ]]; then
      gaps+="milestone,"
    fi
    if [[ $kind == issue && $FIELDS -gt 0 ]]; then
      # A partially-filled item still owes the missing org fields (thread 3):
      # compare available field names against the ones actually set.
      IFS=',' read -r -a have <<< "$fields"
      IFS=',' read -r -a want <<< "$FIELD_NAMES"
      if [[ ${#want[@]} -gt 0 && ${want[0]} != "" ]]; then
        missing=0
        for w in "${want[@]}"; do
          found=0
          for h in "${have[@]}"; do
            [[ $h == "$w" ]] && found=1 && break
          done
          [[ $found -eq 0 ]] && missing=1 && break
        done
        [[ $missing -eq 1 ]] && gaps+="fields,"
      fi
    fi
    if [[ -n $gaps ]]; then
      printf '%s\t%s\t%s\n' "$n" "$kind" "${gaps%,}"
    fi
  done
