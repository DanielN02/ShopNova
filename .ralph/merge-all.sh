#!/usr/bin/env bash
# =============================================================================
# ShopNova — Merge all workstream branches in dependency order
# Usage: bash .ralph/merge-all.sh
#
# Merge order (respects dependencies):
#   1. W1 (integration) — foundation, must merge first
#   2. W3, W4, W5, W6 — independent workstreams
#   3. W2, W7, W8 — depend on W1
# =============================================================================

set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)

echo "=== ShopNova — Merging All Workstream Branches ==="
echo ""

# -- Check completion status ---------------------------------------------------
INCOMPLETE=0
for dir in .worktrees/w*/; do
  if [ ! -f "${dir}/PROGRESS.md" ]; then
    continue
  fi
  workstream=$(basename "$dir")
  remaining=$(grep -c '^\- \[ \]' "${dir}/PROGRESS.md" 2>/dev/null || echo 0)
  remaining=$(printf '%s' "${remaining:-0}" | tr -cd '0-9')
  remaining=${remaining:-0}
  if [ "$remaining" -gt 0 ] 2>/dev/null; then
    echo "WARNING: $workstream has $remaining incomplete tasks"
    INCOMPLETE=1
  fi
done

if [ "$INCOMPLETE" -eq 1 ]; then
  read -p "Some workstreams are incomplete. Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

MAIN_BRANCH=$(git branch --show-current)
echo "Merging into: $MAIN_BRANCH"
echo ""

# -- Merge function with TypeScript validation ---------------------------------
merge_branch() {
  local branch="$1"
  local label="$2"

  if ! git rev-parse --verify "$branch" &>/dev/null; then
    echo "  SKIP: Branch $branch does not exist"
    return 0
  fi

  echo "Merging $branch ($label)..."
  if git merge "$branch" --no-edit 2>/dev/null; then
    echo "  Merged successfully"
  else
    echo "  CONFLICT in $branch"
    echo "  Please resolve conflicts manually, then run: git merge --continue"
    echo "  After resolving, re-run this script."
    exit 1
  fi
}

validate_typescript() {
  local label="$1"
  echo "  Validating TypeScript after $label..."

  local errors=0

  # Frontend
  if [ -f "frontend/tsconfig.json" ]; then
    fe_errors=$(cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
    fe_errors=$(printf '%s' "${fe_errors:-0}" | tr -cd '0-9')
    fe_errors=${fe_errors:-0}
    errors=$((errors + fe_errors))
  fi

  # Backend services
  for svc in user-service product-service order-service notification-service; do
    if [ -f "services/$svc/tsconfig.json" ]; then
      svc_errors=$(cd "services/$svc" && npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
      svc_errors=$(printf '%s' "${svc_errors:-0}" | tr -cd '0-9')
      svc_errors=${svc_errors:-0}
      errors=$((errors + svc_errors))
    fi
  done

  if [ "$errors" -gt 0 ]; then
    echo "  WARNING: $errors TypeScript errors after merging $label"
    echo "  Run 'cd frontend && npx tsc --noEmit' to see details"
  else
    echo "  TypeScript: clean"
  fi
}

# =============================================================================
# Phase 1: Merge W1 (foundation)
# =============================================================================
echo "--- Phase 1: Foundation ---"
merge_branch "shopnova-integration" "W1: Frontend-Backend Integration"
validate_typescript "W1"
echo ""

# =============================================================================
# Phase 2: Merge independent workstreams (W3, W4, W5, W6)
# =============================================================================
echo "--- Phase 2: Independent workstreams ---"
merge_branch "shopnova-security" "W3: Rate Limiting & Security"
merge_branch "shopnova-docker" "W4: Service Dockerfiles"
merge_branch "shopnova-testing" "W5: Frontend Testing"
merge_branch "shopnova-upload" "W6: Image Upload"
validate_typescript "W3+W4+W5+W6"
echo ""

# =============================================================================
# Phase 3: Merge dependent workstreams (W2, W7, W8)
# =============================================================================
echo "--- Phase 3: Dependent workstreams ---"
merge_branch "shopnova-websocket" "W2: WebSocket Real-time"
merge_branch "shopnova-admin-crud" "W7: Admin CRUD Actions"
merge_branch "shopnova-pagination" "W8: Pagination & Search"
validate_typescript "W2+W7+W8"
echo ""

# =============================================================================
# Final validation
# =============================================================================
echo "=== Final Validation ==="
echo ""

echo "TypeScript (all)..."
TOTAL_ERRORS=0

if [ -f "frontend/tsconfig.json" ]; then
  FE_ERR=$(cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
  FE_ERR=$(printf '%s' "${FE_ERR:-0}" | tr -cd '0-9'); FE_ERR=${FE_ERR:-0}
  TOTAL_ERRORS=$((TOTAL_ERRORS + FE_ERR))
  if [ "$FE_ERR" -gt 0 ]; then
    echo "  Frontend: $FE_ERR errors"
  else
    echo "  Frontend: clean"
  fi
fi

for svc in user-service product-service order-service notification-service; do
  if [ -f "services/$svc/tsconfig.json" ]; then
    SVC_ERR=$(cd "services/$svc" && npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
    SVC_ERR=$(printf '%s' "${SVC_ERR:-0}" | tr -cd '0-9'); SVC_ERR=${SVC_ERR:-0}
    TOTAL_ERRORS=$((TOTAL_ERRORS + SVC_ERR))
    if [ "$SVC_ERR" -gt 0 ]; then
      echo "  $svc: $SVC_ERR errors"
    else
      echo "  $svc: clean"
    fi
  fi
done

echo ""
if [ "$TOTAL_ERRORS" -gt 0 ]; then
  echo "WARNING: $TOTAL_ERRORS total TypeScript errors across all projects"
else
  echo "All TypeScript checks passed."
fi

# Backend tests
echo ""
echo "Backend tests..."
npm test 2>&1 | tail -10 || echo "  (some tests may have failed)"

echo ""
echo "=== Merge Complete ==="
echo ""
echo "All 8 workstream branches merged into $MAIN_BRANCH."
echo ""

# -- Cleanup worktrees ---------------------------------------------------------
read -p "Remove worktrees and feature branches? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  for dir in .worktrees/w*/; do
    if [ -d "$dir" ]; then
      git worktree remove "$dir" --force 2>/dev/null || true
      echo "  Removed $dir"
    fi
  done
  rmdir .worktrees 2>/dev/null || true

  for branch in shopnova-integration shopnova-websocket shopnova-security shopnova-docker shopnova-testing shopnova-upload shopnova-admin-crud shopnova-pagination; do
    git branch -d "$branch" 2>/dev/null || true
  done
  echo "Worktrees and feature branches cleaned up."
fi
