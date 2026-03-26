#!/usr/bin/env bash
#
# SHOPNOVA - Autonomous Dev Loop Runner
# Usage: bash .ralph/loop.sh
#

set -euo pipefail

# -- Configuration ------------------------------------------------------------
MAX_ITERATIONS=50
RATE_LIMIT_SECONDS=5
LOG_DIR=".ralph/logs"
# Use CWD as project root (supports worktrees where CWD != script location)
PROJECT_ROOT="${RALPH_PROJECT_ROOT:-$(pwd)}"
PROMPT_FILE="$PROJECT_ROOT/.ralph/PROMPT.md"
# Look for PROGRESS.md in CWD first (worktree), fallback to PROJECT_ROOT
if [[ -f "$(pwd)/PROGRESS.md" ]]; then
  PROGRESS_FILE="$(pwd)/PROGRESS.md"
elif [[ -f "$PROJECT_ROOT/PROGRESS.md" ]]; then
  PROGRESS_FILE="$PROJECT_ROOT/PROGRESS.md"
else
  echo "ERROR: No PROGRESS.md found in $(pwd) or $PROJECT_ROOT"
  exit 1
fi
# Use IMPLEMENTATION_PLAN.md from CWD if available (worktree-specific)
if [[ -f "$(pwd)/IMPLEMENTATION_PLAN.md" ]]; then
  IMPL_PLAN="$(pwd)/IMPLEMENTATION_PLAN.md"
else
  IMPL_PLAN="$PROJECT_ROOT/IMPLEMENTATION_PLAN.md"
fi
STUCK_THRESHOLD=3

# -- Setup ---------------------------------------------------------------------
cd "$PROJECT_ROOT"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/loop_${TIMESTAMP}.log"
STUCK_COUNT=0
LAST_TASK=""

log() {
    local msg="[$(date '+%H:%M:%S')] $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

get_current_task() {
    local task
    task=$(grep '<-- NEXT' "$PROGRESS_FILE" 2>/dev/null | sed 's/.*\] //' | sed 's/ *<-- NEXT//' | head -1)
    if [[ -z "$task" ]]; then
        # Fallback: first unchecked task
        task=$(grep '^\- \[ \]' "$PROGRESS_FILE" 2>/dev/null | head -1 | sed 's/^\- \[ \] //')
    fi
    echo "${task:-}"
}

count_remaining() {
    local n
    n=$(grep -c '^\- \[ \]' "$PROGRESS_FILE" 2>/dev/null) || true
    n=$(printf '%s' "${n:-0}" | tr -cd '0-9'); echo "${n:-0}"
}

count_completed() {
    local n
    n=$(grep -c '^\- \[x\]' "$PROGRESS_FILE" 2>/dev/null) || true
    n=$(printf '%s' "${n:-0}" | tr -cd '0-9'); echo "${n:-0}"
}

# -- Pre-flight checks --------------------------------------------------------
if ! command -v claude &>/dev/null; then
    log "ERROR: 'claude' CLI not found in PATH. Install it first."
    exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
    log "ERROR: Prompt file not found at $PROMPT_FILE"
    exit 1
fi

if [[ ! -f "$PROGRESS_FILE" ]]; then
    log "ERROR: Progress file not found at $PROGRESS_FILE"
    exit 1
fi

PROMPT_CONTENT=$(cat "$PROMPT_FILE")

# Append FEATURE_FOCUS.md if it exists (for scoped worktrees)
FEATURE_FOCUS="$PROJECT_ROOT/.ralph/FEATURE_FOCUS.md"
if [[ -f "$FEATURE_FOCUS" ]]; then
    PROMPT_CONTENT="$PROMPT_CONTENT

$(cat "$FEATURE_FOCUS")"
fi

log "======================================"
log "SHOPNOVA Dev Loop Started"
log "Max iterations: $MAX_ITERATIONS"
log "Rate limit: ${RATE_LIMIT_SECONDS}s between iterations"
log "Tasks remaining: $(count_remaining)"
log "Tasks completed: $(count_completed)"
log "Log file: $LOG_FILE"
log "======================================"

# -- Main Loop -----------------------------------------------------------------
for ((i=1; i<=MAX_ITERATIONS; i++)); do
    log ""
    log "--- Iteration $i / $MAX_ITERATIONS ---"

    CURRENT_TASK=$(get_current_task)
    REMAINING=$(count_remaining)
    REMAINING=$((10#${REMAINING//[!0-9]/}))

    if [[ -z "$CURRENT_TASK" ]] || [[ "$REMAINING" -eq 0 ]]; then
        log "No remaining tasks found. All done!"
        break
    fi

    log "Current task: $CURRENT_TASK"
    log "Remaining tasks: $REMAINING"

    # -- Stuck detection -------------------------------------------------------
    if [[ "$CURRENT_TASK" == "$LAST_TASK" ]]; then
        STUCK_COUNT=$((STUCK_COUNT + 1))
        log "WARNING: Same task as last iteration (stuck count: $STUCK_COUNT/$STUCK_THRESHOLD)"
    else
        STUCK_COUNT=0
    fi
    LAST_TASK="$CURRENT_TASK"

    if [[ $STUCK_COUNT -ge $STUCK_THRESHOLD ]]; then
        log "CIRCUIT BREAKER: Stuck on same task for $STUCK_THRESHOLD iterations. Stopping."
        log "Last task attempted: $CURRENT_TASK"
        break
    fi

    # -- Run Claude ------------------------------------------------------------
    ITER_LOG="$LOG_DIR/iter_${TIMESTAMP}_$(printf '%03d' $i).log"
    log "Running claude... (output: $ITER_LOG)"

    set +e
    claude --print --dangerously-skip-permissions \
        -p "$PROMPT_CONTENT" \
        2>&1 | tee "$ITER_LOG"
    CLAUDE_EXIT=$?
    set -e

    if [[ $CLAUDE_EXIT -ne 0 ]]; then
        log "ERROR: Claude exited with code $CLAUDE_EXIT"
        log "Check $ITER_LOG for details."
        break
    fi

    # -- Parse signal from output ----------------------------------------------
    SIGNAL=$(grep -oE 'SIGNAL: (CONTINUE|COMPLETE|BLOCKED|NEED_HUMAN)' "$ITER_LOG" | tail -1 || echo "")

    case "$SIGNAL" in
        "SIGNAL: CONTINUE")
            log "Signal: CONTINUE -- moving to next task"
            ;;
        "SIGNAL: COMPLETE")
            log "Signal: COMPLETE -- all tasks finished!"
            log "Final stats: $(count_completed) completed, $(count_remaining) remaining"
            break
            ;;
        "SIGNAL: BLOCKED")
            log "Signal: BLOCKED -- stopping loop"
            log "Review $ITER_LOG for blocker details."
            break
            ;;
        "SIGNAL: NEED_HUMAN")
            log "Signal: NEED_HUMAN -- human intervention required"
            log "Review $ITER_LOG for details."
            break
            ;;
        *)
            log "WARNING: No valid signal detected in output. Treating as CONTINUE."
            log "This may indicate Claude did not follow the prompt correctly."
            ;;
    esac

    # -- Rate limiting ---------------------------------------------------------
    if [[ $i -lt $MAX_ITERATIONS ]]; then
        log "Rate limiting: waiting ${RATE_LIMIT_SECONDS}s..."
        sleep "$RATE_LIMIT_SECONDS"
    fi
done

# -- Summary -------------------------------------------------------------------
log ""
log "======================================"
log "Loop finished after $i iterations"
log "Tasks completed: $(count_completed)"
log "Tasks remaining: $(count_remaining)"
log "Full log: $LOG_FILE"
log "======================================"
