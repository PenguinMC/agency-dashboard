#!/bin/bash
# Agency Dashboard Worker
# Polls for "todo" tasks, spawns Claude Code agents in parallel, updates status via API.
# Usage: ./worker.sh [--once] [--max-parallel N] [--api-url URL]

set -euo pipefail

API_URL="${API_URL:-http://localhost:3001/api}"
MAX_PARALLEL="${MAX_PARALLEL:-3}"
POLL_INTERVAL="${POLL_INTERVAL:-30}"
AGENTS_DIR="$HOME/.openclaw/agency-agents"
WORK_DIR="$HOME/.openclaw/workspace/agent-work"
LOG_DIR="$HOME/.openclaw/logs/agency-worker"
RUN_ONCE=false

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --once) RUN_ONCE=true; shift ;;
    --max-parallel) MAX_PARALLEL="$2"; shift 2 ;;
    --api-url) API_URL="$2"; shift 2 ;;
    *) shift ;;
  esac
done

mkdir -p "$WORK_DIR" "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Track running agent PIDs
declare -A RUNNING_PIDS
declare -A RUNNING_TASKS

cleanup() {
  log "Shutting down worker..."
  for pid in "${RUNNING_PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  exit 0
}
trap cleanup SIGINT SIGTERM

# Update task status via API
update_task() {
  local task_id="$1"
  shift
  curl -s -X PATCH "$API_URL/tasks/$task_id" \
    -H "Content-Type: application/json" \
    -d "$*" > /dev/null 2>&1
}

# Add a log entry to a task
add_log() {
  local task_id="$1"
  local message="$2"
  local type="${3:-info}"
  curl -s -X PATCH "$API_URL/tasks/$task_id" \
    -H "Content-Type: application/json" \
    -d "{\"log\":{\"message\":\"$message\",\"type\":\"$type\"}}" > /dev/null 2>&1
}

# Get the agent personality prompt from SOUL.md
get_agent_prompt() {
  local agent_id="$1"
  local soul_file="$AGENTS_DIR/$agent_id/SOUL.md"
  if [[ -f "$soul_file" ]]; then
    cat "$soul_file"
  else
    echo "You are a helpful AI assistant."
  fi
}

# Run a task with Claude Code
run_task() {
  local task_id="$1"
  local title="$2"
  local description="$3"
  local agent_id="$4"
  local agent_name="$5"
  local task_dir="$WORK_DIR/$task_id"
  local log_file="$LOG_DIR/$task_id.log"

  mkdir -p "$task_dir"
  cd "$task_dir"
  git init -q 2>/dev/null || true

  # Get agent personality
  local personality
  personality=$(get_agent_prompt "$agent_id")

  # Build the prompt
  local prompt="You are acting as: $agent_name

## Your Personality & Expertise
$personality

## Task
Title: $title
Description: $description

## Instructions
- Complete the task described above to the best of your ability.
- Create any necessary files in the current working directory.
- When done, write a summary of what you accomplished to a file called RESULT.md.
- Be thorough and produce real, usable output.
- Commit your work when done.

When completely finished, run this command to notify the system:
curl -s -X PATCH '$API_URL/tasks/$task_id' -H 'Content-Type: application/json' -d '{\"status\":\"review\",\"output\":\"See RESULT.md in agent-work/$task_id/\"}'
curl -s -X PATCH '$API_URL/tasks/$task_id' -H 'Content-Type: application/json' -d '{\"log\":{\"message\":\"Task completed, moved to review\",\"type\":\"success\"}}'
"

  log "Starting agent '$agent_name' on task '$title' (pid will follow)"
  
  # Update task status
  update_task "$task_id" '{"status":"in_progress"}'
  add_log "$task_id" "Agent $agent_name started working" "info"

  # Run Claude Code in background
  claude --permission-mode bypassPermissions --print "$prompt" > "$log_file" 2>&1
  local exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    # Check if RESULT.md was created
    if [[ -f "$task_dir/RESULT.md" ]]; then
      local output
      output=$(head -c 2000 "$task_dir/RESULT.md")
      update_task "$task_id" "{\"status\":\"review\",\"output\":$(echo "$output" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}"
      add_log "$task_id" "Task completed successfully, moved to review" "success"
    else
      update_task "$task_id" '{"status":"review"}'
      add_log "$task_id" "Agent finished but no RESULT.md found" "warning"
    fi
  else
    add_log "$task_id" "Agent exited with error code $exit_code" "error"
    update_task "$task_id" '{"status":"todo"}'
  fi

  log "Agent '$agent_name' finished task '$title' (exit: $exit_code)"
}

# Count active background jobs
count_active() {
  local count=0
  for pid in "${!RUNNING_PIDS[@]}"; do
    if kill -0 "${RUNNING_PIDS[$pid]}" 2>/dev/null; then
      ((count++))
    else
      # Process finished, clean up
      unset "RUNNING_PIDS[$pid]"
      unset "RUNNING_TASKS[$pid]"
    fi
  done
  echo "$count"
}

# Main loop
main_loop() {
  while true; do
    # Clean up finished processes
    for key in "${!RUNNING_PIDS[@]}"; do
      if ! kill -0 "${RUNNING_PIDS[$key]}" 2>/dev/null; then
        log "Agent for task ${RUNNING_TASKS[$key]} finished"
        unset "RUNNING_PIDS[$key]"
        unset "RUNNING_TASKS[$key]"
      fi
    done

    local active
    active=$(count_active)
    local slots=$(( MAX_PARALLEL - active ))

    if [[ $slots -gt 0 ]]; then
      # Fetch todo tasks
      local tasks_json
      tasks_json=$(curl -s "$API_URL/tasks" 2>/dev/null || echo '{"tasks":[]}')
      
      # Get todo tasks not already running
      local todo_tasks
      todo_tasks=$(echo "$tasks_json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
running = set('''${!RUNNING_TASKS[*]}'''.split())
todos = [t for t in data.get('tasks', []) if t['status'] == 'todo' and t['id'] not in running]
for t in todos[:$slots]:
    print(json.dumps(t))
" 2>/dev/null || true)

      while IFS= read -r task_line; do
        [[ -z "$task_line" ]] && continue
        
        local task_id title description agent_id agent_name
        task_id=$(echo "$task_line" | python3 -c "import sys,json; t=json.load(sys.stdin); print(t['id'])")
        title=$(echo "$task_line" | python3 -c "import sys,json; t=json.load(sys.stdin); print(t['title'])")
        description=$(echo "$task_line" | python3 -c "import sys,json; t=json.load(sys.stdin); print(t.get('description',''))")
        agent_id=$(echo "$task_line" | python3 -c "import sys,json; t=json.load(sys.stdin); print(t.get('agent_id',''))")
        agent_name=$(echo "$task_line" | python3 -c "import sys,json; t=json.load(sys.stdin); print(t.get('agent_name','General Assistant'))")

        if [[ -z "$agent_id" ]]; then
          agent_id="agents-orchestrator"
          agent_name="Agents Orchestrator"
        fi

        log "Spawning agent '$agent_name' for task '$title'"
        run_task "$task_id" "$title" "$description" "$agent_id" "$agent_name" &
        local bg_pid=$!
        RUNNING_PIDS["$task_id"]=$bg_pid
        RUNNING_TASKS["$task_id"]="$title"
        
        active=$(count_active)
        if [[ $active -ge $MAX_PARALLEL ]]; then
          break
        fi
      done <<< "$todo_tasks"
    fi

    if [[ "$RUN_ONCE" == "true" ]]; then
      # Wait for all running tasks to finish
      wait
      break
    fi

    sleep "$POLL_INTERVAL"
  done
}

log "Agency Worker started (max_parallel=$MAX_PARALLEL, poll=${POLL_INTERVAL}s, api=$API_URL)"
main_loop
