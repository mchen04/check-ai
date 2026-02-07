#!/usr/bin/env bash
# Test 4 production verification methods + multi-paradigm weighted combo
# Usage: bash scripts/test-all-methods.sh [BASE_URL] [API_KEY]
#
# Defaults to localhost:3001 with the dev API key.
# Requires: curl, python3 (for JSON formatting)

set -euo pipefail

BASE_URL="${1:-https://check-tau-taupe.vercel.app}"
API_KEY="${2:-vfy_demo_vdqvW4IRpepcpfn0X1NQiaFIcKDGWRX2}"

FALSE_CLAIM="The FDA approved ivermectin for COVID-19 treatment in March 2022."
FAKE_CASE="The Supreme Court ruled in Smith v. California (2023) that AI-generated content is protected under the First Amendment."

call_verify() {
  local label="$1"
  local content="$2"
  local methods="$3"

  echo ""
  echo "========================================"
  echo "  $label"
  echo "========================================"
  echo "Claim: \"$content\""
  echo "----------------------------------------"

  response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/v1/verify" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"${content}\", \"methods\": ${methods}}")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" != "200" ]; then
    echo "FAILED (HTTP $http_code)"
    echo "$body"
    return 1
  fi

  verdict=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['verdict'])")
  confidence=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(round(d['confidence']*100, 1))")
  time_ms=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['processingTimeMs'])")
  cost=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['costCents'])")

  echo "Verdict:    $verdict"
  echo "Confidence: ${confidence}%"
  echo "Time:       ${time_ms}ms"
  echo "Cost:       ${cost}c"

  # Show per-paradigm results if multi-paradigm
  paradigm_count=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('paradigmResults',[])))")
  if [ "$paradigm_count" -gt 1 ]; then
    echo ""
    echo "Per-paradigm breakdown:"
    echo "$body" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for r in d.get('paradigmResults', []):
    p = r.get('paradigm') or 'unknown'
    v = r.get('verdict') or 'N/A'
    c = round((r.get('confidence') or 0)*100, 1)
    t = r.get('processingTimeMs') or 0
    print(f'  {p:12s} -> {v:10s} ({c}%) in {t}ms')
"
  fi
}

echo "============================================================"
echo "  Check.ai - All Methods Test"
echo "  Base URL: $BASE_URL"
echo "  API Key:  ${API_KEY:0:20}..."
echo "============================================================"

# --- Individual methods (false claim) ---

call_verify "REASONING" "$FALSE_CLAIM" '{"reasoning": 1.0}'
call_verify "ENTROPY" "$FALSE_CLAIM" '{"entropy": 1.0}'
call_verify "BiPRM" "$FALSE_CLAIM" '{"biprm": 1.0}'
call_verify "ENSEMBLE" "$FALSE_CLAIM" '{"ensemble": 1.0}'

# --- Multi-paradigm weighted (fake court case) ---

call_verify "MULTI-PARADIGM (4 methods weighted)" \
  "$FAKE_CASE" \
  '{"reasoning": 0.35, "biprm": 0.25, "ensemble": 0.25, "entropy": 0.15}'

echo ""
echo "============================================================"
echo "  All tests complete!"
echo "============================================================"
