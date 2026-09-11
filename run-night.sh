#!/usr/bin/env bash
cd "$HOME/NewProjects/bala-kanda" || exit 1
mkdir -p night-logs
MAX=14
for i in $(seq 1 $MAX); do
  [ -f STOP-NIGHT ] && { echo "stop file present, exiting"; break; }
  echo "=== iteration $i  $(date '+%H:%M:%S') ===" | tee -a night-logs/run.log
  claude --dangerously-skip-permissions --model sonnet -p \
    "Read OVERNIGHT.md, SESSION-LOG.md, TODO.md, AGENTS.md and ARCHITECTURE.md. \
     Work on branch feat/pass-3-overnight. Continue the overnight plan from wherever \
     SESSION-LOG.md says you left off. Do the next unfinished phase. Commit and update \
     SESSION-LOG.md before you stop, always." \
    >> "night-logs/iter-$i.log" 2>&1
  echo "--- iteration $i exit=$? $(date '+%H:%M:%S') ---" | tee -a night-logs/run.log
  sleep 120
done
echo "loop finished $(date)" | tee -a night-logs/run.log
