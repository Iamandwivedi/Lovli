#!/usr/bin/env bash
# Lovli copy rule: user facing text never uses em dashes or en dashes.
# Scans mobile/app and mobile/src (ts, tsx) and fails on any hit outside a
# comment line. Run via `yarn lint:copy` from the mobile folder.
#
# Implemented in perl so it behaves the same on macOS and Linux: BSD grep has
# no -P, and the old `grep -P ... || true` passed silently on a Mac.
set -u
cd "$(dirname "$0")/.."

hits=$(
  find app src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 \
    | xargs -0 perl -CSD -ne '
        if (/[\x{2014}\x{2013}]/
            && !/^\s*(\/\/|\*|\/\*|\{\/\*)/                   # whole line is a comment
            && !/\/\/[^"\x27`]*[\x{2014}\x{2013}][^"\x27`]*$/  # dash only in a trailing // comment
        ) {
          print "$ARGV:$.: $_";
        }
        close ARGV if eof;  # reset $. per file
      '
) || { echo "lint:copy: scan failed (perl or find error)"; exit 2; }

if [ -n "$hits" ]; then
  echo "Em or en dash found in user facing copy. Rewrite with a comma, colon, or period:"
  echo "$hits"
  exit 1
fi
echo "lint:copy: no em or en dashes in app/ or src/."
