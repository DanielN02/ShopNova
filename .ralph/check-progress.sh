#!/usr/bin/env bash
# =============================================================================
# ShopNova — Progress Dashboard
# Shows completion status of all 8 workstreams with progress bars
# Usage: bash .ralph/check-progress.sh
# =============================================================================

cd "$(dirname "$0")/.."

echo "=== ShopNova — Workstream Progress ==="
echo ""
printf "%-6s %-35s %-20s %s\n" "ID" "Workstream" "Status" "Progress"
printf "%-6s %-35s %-20s %s\n" "------" "-----------------------------------" "--------------------" "--------"

declare -a WORKSTREAMS=(
  "w1:integration:Frontend-Backend Integration"
  "w2:websocket:WebSocket Real-time"
  "w3:security:Rate Limiting & Security"
  "w4:docker:Service Dockerfiles"
  "w5:testing:Frontend Testing"
  "w6:upload:Image Upload"
  "w7:admin-crud:Admin CRUD Actions"
  "w8:pagination:Pagination & Search"
)

total_remaining=0
total_done=0
total_workstreams=0
completed_workstreams=0

for entry in "${WORKSTREAMS[@]}"; do
  IFS=':' read -r id slug display <<< "$entry"
  dir=".worktrees/${id}-${slug}"

  if [ ! -f "${dir}/PROGRESS.md" ]; then
    printf "%-6s %-35s %-20s %s\n" "$id" "$display" "NOT SET UP" "-"
    continue
  fi

  done=$(grep -c '^\- \[x\]' "${dir}/PROGRESS.md" 2>/dev/null) || true
  remaining=$(grep -c '^\- \[ \]' "${dir}/PROGRESS.md" 2>/dev/null) || true
  done=$(printf '%s' "${done:-0}" | tr -cd '0-9'); done=${done:-0}
  remaining=$(printf '%s' "${remaining:-0}" | tr -cd '0-9'); remaining=${remaining:-0}
  total=$((done + remaining))

  total_remaining=$((total_remaining + remaining))
  total_done=$((total_done + done))
  total_workstreams=$((total_workstreams + 1))

  # Build progress bar
  if [ "$total" -gt 0 ]; then
    pct=$((done * 100 / total))
    filled=$((pct / 5))    # 20 chars wide
    empty=$((20 - filled))
    bar=$(printf '%0.s#' $(seq 1 $filled 2>/dev/null) 2>/dev/null || echo "")
    space=$(printf '%0.s-' $(seq 1 $empty 2>/dev/null) 2>/dev/null || echo "")
    progress_bar="[${bar}${space}] ${pct}%"
  else
    progress_bar="[--------------------] 0%"
  fi

  if [ "$remaining" -eq 0 ] && [ "$total" -gt 0 ]; then
    status="COMPLETE ($done/$total)"
    completed_workstreams=$((completed_workstreams + 1))
  elif [ "$done" -eq 0 ]; then
    status="WAITING ($remaining tasks)"
  else
    status="IN PROGRESS ($done/$total)"
  fi

  printf "%-6s %-35s %-20s %s\n" "$id" "$display" "$status" "$progress_bar"
done

echo ""
echo "----------------------------------------------------------------------"
grand_total=$((total_done + total_remaining))
if [ "$grand_total" -gt 0 ]; then
  grand_pct=$((total_done * 100 / grand_total))
else
  grand_pct=0
fi
echo "Overall: $total_done/$grand_total tasks done (${grand_pct}%), $completed_workstreams/$total_workstreams workstreams complete"
echo ""

# Show dependency status
echo "Dependency status:"
w1_dir=".worktrees/w1-integration"
if [ -f "${w1_dir}/PROGRESS.md" ]; then
  w1_remaining=$(grep -c '^\- \[ \]' "${w1_dir}/PROGRESS.md" 2>/dev/null || echo "0")
  w1_remaining=$(printf '%s' "${w1_remaining:-0}" | tr -cd '0-9')
  w1_remaining=${w1_remaining:-0}
  if [ "$w1_remaining" -eq 0 ]; then
    echo "  W1 (Integration): DONE -- W2, W7, W8 can proceed"
  else
    echo "  W1 (Integration): IN PROGRESS -- W2, W7, W8 blocked"
  fi
fi
echo ""

# Show recent log activity
echo "Recent log activity:"
if ls .ralph/logs/loop_*.log 1>/dev/null 2>&1; then
  for log in $(ls -t .ralph/logs/loop_*.log | head -3); do
    last_line=$(tail -1 "$log" 2>/dev/null || echo "")
    echo "  $(basename "$log"): $last_line"
  done
else
  echo "  No logs found yet."
fi
echo ""
