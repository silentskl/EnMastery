#!/usr/bin/env bash
set -euo pipefail
printf 'Node: '; node --version
printf 'npm:  '; npm --version
printf 'OS:   '; uname -srm
if [[ -d node_modules ]]; then
  echo 'node_modules: present'
else
  echo 'node_modules: absent'
fi
for cmd in next opennextjs-cloudflare tsc; do
  if [[ -x "node_modules/.bin/$cmd" ]]; then echo "$cmd: installed"; else echo "$cmd: missing"; fi
done
