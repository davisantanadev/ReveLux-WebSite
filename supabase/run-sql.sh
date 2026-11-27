#!/usr/bin/env bash
# Roda um arquivo .sql no projeto pela Management API do Supabase.
# Uso: SUPABASE_ACCESS_TOKEN=... ./supabase/run-sql.sh supabase/migrations/arquivo.sql
set -euo pipefail
REF="${SUPABASE_PROJECT_REF:-pfzuuypvagzztfpwjqyz}"
python3 -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1]).read()}))' "$1" |
curl -sS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN:-proxy-injected}" -H "Content-Type: application/json" \
  --data-binary @- -w '\n[HTTP %{http_code}]\n'
