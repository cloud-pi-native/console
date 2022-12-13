#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1


# Declare script helper
TEXT_HELPER="\nThis script aims to build a markdown style vulnerability report for the trivy json scan results. It will read the files and then build a markdown summary (compatible with Github issue) summarising the vulnerabilities for each image and configuration file for the given input folder.

Following flags are available:

  -i    Input folder that contain trivy json scan result files into subfolders 'images/' and 'configs/'.
        Please provide the path without last slash (i.e not like this 'path/to/folder/').

  -o    Output file for the generated markdown report.
        Please provide the path with the markdown file extension (i.e '.md').

  -p    Github project (format as '<owner>/<repo_name>').
        It can be set in GitHub Actions as '\${{ github.repository }}'.

  -r    Github actions run ID.
        It can be set in GitHub Actions as '\${{ github.run_id }}'.

  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts hi:o:p:r: flag
do
  case "${flag}" in
    i)
      INPUT="${OPTARG}";;
    o)
      OUTPUT="${OPTARG}";;
    p)
      REPO="${OPTARG}";;
    r)
      RUN_ID="${OPTARG}";;
    h | *)
      print_help
      exit 0;;
  esac
done


NOW="$(date +'%d/%m/%Y at %H:%M')"
ARTIFACT_DOWNLOAD_URL="https://github.com/${REPO}/actions/runs/${RUN_ID}"


if [ -z "$INPUT" ] || [ -z "$OUTPUT" ] || [ -z "$REPO" ] || [ -z "$RUN_ID" ] || [ -z "$TOKEN" ]; then
  echo "Argument(s) missing, you should set all paramters."
  print_help
  exit 0
fi


_jq() {
  echo ${1} | base64 --decode | jq -r ${2}
}


printf "\n${red}${i}.${no_color} Build vulnerability report\n"
i=$(($i + 1))

VULNERABILITY_REPORT_BODY="# Security report

:robot: This report was generated automatically the $NOW.

It summarizes the result of a vulnerability scan of Trivy for each docker image and configuration file.
You should take a look at it and possibly modify some dependencies to fix vulnerabilities or update your configuration files."

#--------------------#
# Images scan report #
#--------------------#
if [[ -n $(find $INPUT/images/*) ]]; then
  FORMATED_REPORT=$(jq -s '.' $INPUT/images/* | jq '[ .[] | {
    name: .ArtifactName,
    type: .ArtifactType,
    results: [
      .Results[] | select(.Vulnerabilities != null) | {
        class: .Class,
        target: .Target,
        type: .Type,
        length: .Vulnerabilities | (if length == 0 then "-" else length end),
        vulnerabilityType: {
          critical: [.Vulnerabilities[] | select(.Severity == "CRITICAL")] | (if length == 0 then "-" else length end),
          high: [.Vulnerabilities[] | select(.Severity == "HIGH")] | (if length == 0 then "-" else length end),
          medium: [.Vulnerabilities[] | select(.Severity == "MEDIUM")] | (if length == 0 then "-" else length end),
          low: [.Vulnerabilities[] | select(.Severity == "LOW")] | (if length == 0 then "-" else length end),
          unknown: [.Vulnerabilities[] | select(.Severity == "UNKNOWN")] | (if length == 0 then "-" else length end)
        }
      }
    ]
  } ]')

  VULNERABILITY_REPORT_BODY="$VULNERABILITY_REPORT_BODY

## Images scan"

  for row in $(echo "${FORMATED_REPORT}" | jq -r '.[] | @base64'); do
    OS_NAME=$(echo "$(_jq "${row}" '.')" | jq -r '.results[] | select(.class == "os-pkgs") | .target' | awk '{split($0,a,":"); print a[1]}')
    OS_FULL_NAME=$(echo "$(_jq "${row}" '.')" | jq -r '.results[] | select(.class == "os-pkgs") | .target')
    OS_TOTAL_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .results[] | select(.class == "os-pkgs") | .length ] | add')
    OS_CRITICAL_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .results[] | select(.class == "os-pkgs") | .vulnerabilityType.critical ] | add')
    OS_HIGH_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .results[] | select(.class == "os-pkgs") | .vulnerabilityType.high ] | add')
    OS_MEDIUM_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .results[] | select(.class == "os-pkgs") | .vulnerabilityType.medium ] | add')
    OS_LOW_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .results[] | select(.class == "os-pkgs") | .vulnerabilityType.low ] | add')
    OS_UNKNOWN_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .results[] | select(.class == "os-pkgs") | .vulnerabilityType.unknown ] | add')

    if [[ $OS_TOTAL_COUNT = 'null' ]]; then
      IMAGE_SCAN_SUMMARY="
:white_check_mark: No security issues were detected."
    else
      IMAGE_SCAN_SUMMARY="
|     Critical    |     High    |     Medium    |     Low    |     Unknown    |    Total    |
|:---------------:|:-----------:|:-------------:|:----------:|:--------------:|:-----------:|
| $OS_CRITICAL_COUNT | $OS_HIGH_COUNT | $OS_MEDIUM_COUNT | $OS_LOW_COUNT | $OS_UNKNOWN_COUNT | $OS_TOTAL_COUNT|
"
    fi

    VULNERABILITY_REPORT_BODY="$VULNERABILITY_REPORT_BODY

### Results for image '$OS_NAME'

**Image tag**: $OS_FULL_NAME

**Image scan**

$IMAGE_SCAN_SUMMARY"

    DEP_TOTAL_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .results[] | select(.class == "lang-pkgs") | .length ] | add')
    if [[ $DEP_TOTAL_COUNT = 'null' ]]; then
      SCAN_SUMMARY="
:white_check_mark: No security issues were detected."
    else
      SCAN_SUMMARY="
|   Target   |     Critical    |     High    |     Medium    |     Low    |     Unknown    |    Total    |
|:-----------|:---------------:|:-----------:|:-------------:|:----------:|:--------------:|:-----------:|"

      for row2 in $(echo "$(_jq ${row} '.')" | jq -r '.results[] | select(.class == "lang-pkgs") | @base64'); do
        FULL_NAME=$(echo "$(_jq ${row2} '.')" | jq -r '.target')
        TOTAL_COUNT=$(echo "$(_jq ${row2} '.')" | jq -r '.length')
        CRITICAL_COUNT=$(echo "$(_jq ${row2} '.')" | jq -r '[ .vulnerabilityType.critical ] | add')
        HIGH_COUNT=$(echo "$(_jq ${row2} '.')" | jq -r '[ .vulnerabilityType.high ] | add')
        MEDIUM_COUNT=$(echo "$(_jq ${row2} '.')" | jq -r '[ .vulnerabilityType.medium ] | add')
        LOW_COUNT=$(echo "$(_jq ${row2} '.')" | jq -r '[ .vulnerabilityType.low ] | add')
        UNKNOWN_COUNT=$(echo "$(_jq ${row2} '.')" | jq -r '[ .vulnerabilityType.unknown ] | add')

        SCAN_SUMMARY="$SCAN_SUMMARY
| $FULL_NAME | $CRITICAL_COUNT | $HIGH_COUNT | $MEDIUM_COUNT | $LOW_COUNT | $UNKNOWN_COUNT | $TOTAL_COUNT |"

      done
    fi
    VULNERABILITY_REPORT_BODY="$VULNERABILITY_REPORT_BODY
**Dependencies scan**

$SCAN_SUMMARY"
  done

  SCAN_IMAGES=true
fi

#--------------------#
# Config scan report #
#--------------------#
if [[ -n $(find $INPUT/configs/*) ]]; then
  FORMATED_REPORT=$(jq -s '.' $INPUT/configs/* | jq '.[] | {
    name: .ArtifactName,
    type: .ArtifactType,
    results: [
      .Results[] | select(.Misconfigurations != null) | {
        class: .Class,
        target: .Target,
        type: .Type,
        length: .Misconfigurations | (if length == 0 then "-" else length end),
        vulnerabilityType: {
          critical: [.Misconfigurations[] | select(.Severity == "CRITICAL")] | (if length == 0 then "-" else length end),
          high: [.Misconfigurations[] | select(.Severity == "HIGH")] | (if length == 0 then "-" else length end),
          medium: [.Misconfigurations[] | select(.Severity == "MEDIUM")] | (if length == 0 then "-" else length end),
          low: [.Misconfigurations[] | select(.Severity == "LOW")] | (if length == 0 then "-" else length end),
          unknown: [.Misconfigurations[] | select(.Severity == "UNKNOWN")] | (if length == 0 then "-" else length end)
        }
      }
    ]
  }')

  VULNERABILITY_REPORT_BODY="$VULNERABILITY_REPORT_BODY

## Config scan"

  TOTAL_CONFIG=$(echo $FORMATED_REPORT | jq -r '[ .results[].length ] | add')
  if [[ $TOTAL_CONFIG = 'null' ]]; then
      SCAN_SUMMARY="
:white_check_mark: No security issues were detected."
    else
      SCAN_SUMMARY="
|   Target   |     Critical    |     High    |     Medium    |     Low    |     Unknown    |    Total    |
|:-----------|:---------------:|:-----------:|:-------------:|:----------:|:--------------:|:-----------:|"
  fi

  for row in $(echo "${FORMATED_REPORT}" | jq -r '.results[] | @base64'); do
    FULL_NAME=$(echo "$(_jq "${row}" '.')" | jq -r '.target')
    TOTAL_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '.length')
    CRITICAL_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .vulnerabilityType.critical ] | add')
    HIGH_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .vulnerabilityType.high ] | add')
    MEDIUM_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .vulnerabilityType.medium ] | add')
    LOW_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .vulnerabilityType.low ] | add')
    UNKNOWN_COUNT=$(echo "$(_jq "${row}" '.')" | jq -r '[ .vulnerabilityType.unknown ] | add')

    SCAN_SUMMARY="$SCAN_SUMMARY
| $FULL_NAME | $CRITICAL_COUNT | $HIGH_COUNT | $MEDIUM_COUNT | $LOW_COUNT | $UNKNOWN_COUNT | $TOTAL_COUNT|"

  done
  VULNERABILITY_REPORT_BODY="$VULNERABILITY_REPORT_BODY
$SCAN_SUMMARY"

  SCAN_CONFIG=true
fi

if [ "$SCAN_DEPENDENCIES" = true ] || [ "$SCAN_CONFIG" = true ] || [ "$SCAN_IMAGES" = true ]; then
  printf "\n${red}${i}.${no_color} Add artifacts download url to the vulnerability report body\n"
  i=$(($i + 1))

  VULNERABILITY_REPORT_BODY=$(cat <<EOF
$VULNERABILITY_REPORT_BODY

## Download report

Click [here]($ARTIFACT_DOWNLOAD_URL) to download the full vulnerability report with all (detailed) json files.
EOF
)

  printf "\nVulnerability report preview :\n\n$VULNERABILITY_REPORT_BODY\n"

  echo "$VULNERABILITY_REPORT_BODY" > "$OUTPUT"
fi
