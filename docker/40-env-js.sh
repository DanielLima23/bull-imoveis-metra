#!/bin/sh
set -eu

: "${API_URL:=http://localhost:5140/api}"

if [ -f /usr/share/nginx/html/env.template.js ]; then
  envsubst '${API_URL}' < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js
fi
