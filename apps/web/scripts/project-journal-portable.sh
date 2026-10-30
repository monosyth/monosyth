#!/bin/sh
set -eu

# Preserve Scott's existing local owner workflow on his Mac.
if [ "$(uname -s)" = "Darwin" ] && [ -d /Users/scottwaite/monosythlabs/apps/web ] && [ -x /Users/scottwaite/.nvm/versions/node/v22.22.1/bin/node ]; then
  cd /Users/scottwaite/monosythlabs/apps/web
  exec /Users/scottwaite/.nvm/versions/node/v22.22.1/bin/node --no-deprecation --conditions=react-server --import tsx scripts/project-tracker.ts "$@"
fi

# Linux receives only a dedicated journal credential after owner approval.
journal_tools_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -f "$journal_tools_dir/project-journal-linux.py" ]; then
  exec python3 "$journal_tools_dir/project-journal-linux.py" "$@"
fi
exec python3 "$journal_tools_dir/project-journal-client.py" "$@"
