#!/usr/bin/env sh

set -e

echo "Create temporary file"
FILE=$(mktemp -p . --suffix=".js")

echo "Add header"
tee -a ${FILE} << EOF
// @ts-check
import { icons as riCollection } from '@iconify-json/ri'

/**
 * @type {string[]}
 */
const riIconNames = [
EOF

echo "Add used icons"
ICONS=$(grep -r --binary-files=without-match -oh "ri:[a-z0-9-]*" src dist | sort | uniq | cut -d ':' -f 2 | awk NF | awk '{print "  \047" $1 "\047,"}')
echo ${ICONS} | tee -a $FILE

echo "Add footer"
tee -a ${FILE} << EOF
]

/**
 * @type {[import('@iconify/vue').IconifyJSON, string[]][]}
 */
export const collectionsToFilter = [[riCollection, riIconNames]]
EOF

echo "Convert to proper icon-collection"
node_modules/.bin/vue-dsfr-icons -s ${FILE} -t src/icon-collections.ts

echo "Remove temporary file"
rm ${FILE}
