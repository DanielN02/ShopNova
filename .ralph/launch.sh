#!/usr/bin/env bash
# =============================================================================
# ShopNova — Launch all parallel agents with a single command
# Usage: bash .ralph/launch.sh
#
# Orchestrates 8 workstreams in dependency wave order:
#   Wave 1: W1 (Frontend-Backend Integration — must complete first)
#   Wave 2: W2, W3, W4, W5, W6, W7, W8 (all 7 in parallel after W1)
#
# W1 is the critical integration workstream. Everything else either depends
# on it (W2, W7, W8) or is independent but benefits from the patterns it sets.
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

# -- Workstream definitions ----------------------------------------------------
declare -a WAVE1=(
  "w1-integration:Frontend-Backend Integration"
)

declare -a WAVE2=(
  "w2-websocket:WebSocket Real-time"
  "w3-security:Rate Limiting & Security"
  "w4-docker:Service Dockerfiles"
  "w5-testing:Frontend Testing"
  "w6-upload:Image Upload"
  "w7-admin-crud:Admin CRUD Actions"
  "w8-pagination:Pagination & Search"
)

LAUNCH_STAGGER=3  # seconds between launches to avoid rate limits

echo "=============================================="
echo "  ShopNova — Parallel Agent Launcher"
echo "=============================================="
echo ""
echo "  Wave 1 (sequential): W1 Frontend-Backend Integration"
echo "  Wave 2 (parallel):   W2-W8 (7 agents after W1 completes)"
echo ""

# -- Pre-flight: verify worktrees exist ----------------------------------------
echo "Checking worktrees..."
ALL_ENTRIES=("${WAVE1[@]}" "${WAVE2[@]}")
MISSING=0
for entry in "${ALL_ENTRIES[@]}"; do
  IFS=':' read -r id display <<< "$entry"
  dir=".worktrees/${id}"
  if [ ! -d "$dir" ]; then
    echo "  MISSING: $dir"
    MISSING=1
  fi
done

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Worktrees not found. Running setup-parallel.sh..."
  bash "${ROOT}/.ralph/setup-parallel.sh"
  echo ""
fi

# Re-verify after setup
for entry in "${ALL_ENTRIES[@]}"; do
  IFS=':' read -r id display <<< "$entry"
  dir=".worktrees/${id}"
  if [ ! -d "$dir" ]; then
    echo "ERROR: Worktree $dir still not found after setup. Aborting."
    exit 1
  fi
  if [ ! -f "$dir/PROGRESS.md" ]; then
    echo "ERROR: $dir/PROGRESS.md not found. Aborting."
    exit 1
  fi
done
echo "All 8 worktrees verified."
echo ""

# -- Pre-flight: check claude CLI ----------------------------------------------
if ! command -v claude &>/dev/null; then
    echo "ERROR: 'claude' CLI not found in PATH."
    echo "Install: https://docs.anthropic.com/en/docs/claude-code"
    exit 1
fi
echo "Claude CLI: found"

# -- Pre-flight: check git status ----------------------------------------------
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
    echo "WARNING: Uncommitted changes in main worktree."
    echo "  Consider committing before launching agents."
fi
echo "Git: ok"

# -- Pre-flight: TypeScript check (quick) -------------------------------------
echo "TypeScript pre-flight (frontend)..."
TS_ERRORS=0
if [ -f "frontend/tsconfig.json" ]; then
  TS_ERRORS=$(cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
  TS_ERRORS=$(printf '%s' "${TS_ERRORS:-0}" | tr -cd '0-9')
  TS_ERRORS=${TS_ERRORS:-0}
  if [ "$TS_ERRORS" -gt 0 ]; then
    echo "  WARNING: $TS_ERRORS TypeScript errors in frontend"
  else
    echo "  Frontend TypeScript: clean"
  fi
fi
echo ""

# -- Helper: launch a loop in a worktree --------------------------------------
launch_loop() {
  local id="$1"
  local display="$2"
  local dir="${ROOT}/.worktrees/${id}"

  echo "[${id}] Launching: ${display}..."
  (cd "$dir" && RALPH_PROJECT_ROOT="$dir" bash "${ROOT}/.ralph/loop.sh") &
  echo $!
}

# =============================================================================
# WAVE 1: W1 must complete before anything else launches
# =============================================================================
echo "=============================================="
echo "  WAVE 1: Frontend-Backend Integration (W1)"
echo "=============================================="
echo ""
echo "W1 must complete before Wave 2 launches."
echo "This is the critical integration workstream."
echo ""

W1_DIR="${ROOT}/.worktrees/w1-integration"
echo "[w1] Launching: Frontend-Backend Integration..."
(cd "$W1_DIR" && RALPH_PROJECT_ROOT="$W1_DIR" bash "${ROOT}/.ralph/loop.sh")
W1_EXIT=$?

if [ $W1_EXIT -ne 0 ]; then
  echo ""
  echo "ERROR: W1 (Frontend-Backend Integration) failed with exit code $W1_EXIT"
  echo "Cannot proceed to Wave 2. Fix W1 issues and re-run."
  exit 1
fi

# Check if W1 actually completed all tasks
W1_REMAINING=$(grep -c '^\- \[ \]' "${W1_DIR}/PROGRESS.md" 2>/dev/null || echo "0")
W1_REMAINING=$(printf '%s' "${W1_REMAINING:-0}" | tr -cd '0-9')
W1_REMAINING=${W1_REMAINING:-0}

echo ""
if [ "$W1_REMAINING" -gt 0 ]; then
  echo "WARNING: W1 finished but has $W1_REMAINING incomplete tasks."
  echo "Wave 2 will proceed, but some dependent workstreams may be affected."
else
  echo "W1 COMPLETE: All integration tasks done."
fi
echo ""

# =============================================================================
# WAVE 2: Launch all 7 remaining workstreams in parallel
# =============================================================================
echo "=============================================="
echo "  WAVE 2: Launching 7 parallel agents"
echo "=============================================="
echo ""

PIDS=()
WAVE2_IDS=()
for entry in "${WAVE2[@]}"; do
  IFS=':' read -r id display <<< "$entry"
  WAVE2_IDS+=("$id")
  PID=$(launch_loop "$id" "$display")
  PIDS+=("$PID")
  sleep "$LAUNCH_STAGGER"
done

echo ""
echo "All 7 Wave 2 loops launched."
echo "PIDs: ${PIDS[*]}"
echo ""
echo "Monitor progress:  bash .ralph/check-progress.sh"
echo "Monitor logs:      tail -f .ralph/logs/loop_*.log"
echo ""
echo "Waiting for all loops to complete..."
echo ""

# -- Wait for all Wave 2 processes --------------------------------------------
FAILED=0
for i in "${!PIDS[@]}"; do
  id="${WAVE2_IDS[$i]}"
  IFS=':' read -r _ display <<< "${WAVE2[$i]}"
  if wait "${PIDS[$i]}"; then
    echo "[${id}] COMPLETED: ${display}"
  else
    echo "[${id}] FAILED: ${display} (exit code $?)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=============================================="
if [ $FAILED -eq 0 ]; then
  echo "  All 8 workstreams completed successfully!"
else
  echo "  $FAILED workstream(s) failed. Check logs for details."
fi
echo "=============================================="
echo ""

# -- Show final progress -------------------------------------------------------
echo "Final progress:"
bash "${ROOT}/.ralph/check-progress.sh"
echo ""

# -- Auto-merge if all succeeded -----------------------------------------------
if [ $FAILED -eq 0 ]; then
  echo "All workstreams complete. Running merge..."
  echo ""
  bash "${ROOT}/.ralph/merge-all.sh"
else
  echo "Some workstreams failed. Fix issues, then run:"
  echo "  bash .ralph/merge-all.sh"
fi
