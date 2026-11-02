#!/usr/bin/env bash
# Lovli copy rule: user facing text never uses em dashes or en dashes.
# Scans mobile/app and mobile/src (ts, tsx) and fails on any hit outside a
# comment line. Run via `yarn lint:copy` from the mobile folder.
set -u
export LC_ALL=C.UTF-8
cd "$(dirname "$0")/.."

hits=$(grep -rn --include='*.ts' --include='*.tsx' -P '[\x{2014}\x{2013}]' app src \
  | grep -vP '^[^:]+:\d+:\s*(//|\*|/\*|\{/\*)' \
  | grep -vP '//[^"'"'"'`]*[\x{2014}\x{2013}][^"'"'"'`]*$' || true)

if [ -n "$hits" ]; then
  echo "Em or en dash found in user facing copy. Rewrite with a comma, colon, or period:"
  echo "$hits"
  exit 1
fi
echo "lint:copy: no em or en dashes in app/ or src/."
