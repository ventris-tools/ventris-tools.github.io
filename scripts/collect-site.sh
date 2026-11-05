#!/usr/bin/env bash
# Copy the files GitHub Pages publishes into _site. The checks run against _site and the
# same folder is what gets deployed, so a new file the site needs has to be added here
# or the checks fail.
set -euo pipefail

cd "$(dirname "$0")/.."
rm -rf _site
mkdir _site
cp -R index.html 404.html styles.css favicon.svg apple-touch-icon.png og.png LICENSE fonts licenses _site/
