#!/usr/bin/env node
/**
 * Agency Dashboard Worker
 * Polls for "todo" tasks, spawns Claude Code agents in parallel, updates status via API.
 * 
 * Usage: node worker.mjs [--once] [--max-parallel N] [--api-url URL]
 */

import { spawn } from 'child_process';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const MAX_PARALLEL = parseInt(process.env.MAX_PARALLEL || '3', 10);
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '30', 10) * 1000;
const AGENTS_DIR = path.join(os.homedir(), '.openclaw', 'agency-agents');
const WORK_DIR = path.join(os.homedir(), '.openclaw', 'workspace', 'agent-work');
const LOG_DIR = path.join(os.homedir(), '.openclaw', 'logs', 'agency-worker');
const RUN_ONCE = process.argv.includes('--once');

// Parse CLI args
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--max-parallel' && process.argv[i + 1]) {
    process.env.MAX_PARALLEL = process.argv[++i];
  }
  if (process.argv[i] === '--api-url' && process.argv[i + 1]) {
    process.env.API_URL = process.argv[++i];
  }
}

await mkdir(WORK_DIR, { recursive: true });
await mkdir(LOG_DIR, { recursive: true });

const runningTasks = new Map(); // taskId -> { process, title, agentName }

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

// API helpers
async function apiGet(path) {
  try {
    const res = await fetch(`${API_URL}${path}`);
    if (res.ok) return await res.json();
  } catch (err) {
    log(`API error GET ${path}: ${err.message}`);
  }
  return null;
}

async function apiPatch(taskId, body) {
  try {
    await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    log(`API error PATCH ${taskId}: ${err.message}`);
  }
}

async function addLog(taskId, message, type = 'info') {
  await apiPatch(taskId, { log: { message, type } });
}

// Get agent personality from SOUL.md
async function getAgentPrompt(agentId) {
  const soulFile = path.join(AGENTS_DIR, agentId, 'SOUL.md');
  try {
    if (existsSync(soulFile)) {
      return await readFile(soulFile, 'utf-8');
    }
  } catch {}
  return 'You are a helpful AI assistant specialized in this domain.';
}

// Spawn Claude Code for a task
async function runTask(task) {
  const { id, title, description, agent_id, agent_name } = task;
  const agentId = agent_id || 'agents-orchestrator';
  const agentName = agent_name || 'General Assistant';
  const taskDir = path.join(WORK_DIR, id);

  await mkdir(taskDir, { recursive: true });

  // Init git if needed
  if (!existsSync(path.join(taskDir, '.git'))) {
    await new Promise((resolve) => {
      const p = spawn('git', ['init', '-q'], { cwd: taskDir });
      p.on('close', resolve);
    });
  }

  const personality = await getAgentPrompt(agentId);

  const prompt = `You are acting as: ${agentName}

## Your Personality & Expertise
${personality}

## Task
Title: ${title}
Description: ${description || 'No additional details provided.'}

## Instructions
- Complete the task described above to the best of your ability.
- You have full access to the filesystem and can run any commands.
- Create output files in the current working directory (${taskDir}).
- When done, write a comprehensive summary of what you accomplished to RESULT.md in the current directory.
- Be thorough and produce real, usable output.
- You can access the internet, search the web, read files anywhere on the system.
- If the task involves code, write production-quality code.
- If the task involves research, be thorough and cite sources.`;

  log(`Spawning agent '${agentName}' for: ${title}`);

  // Update status to in_progress
  await apiPatch(id, { status: 'in_progress' });
  await addLog(id, `Agent ${agentName} started working`, 'info');

  return new Promise((resolve) => {
    const logFile = path.join(LOG_DIR, `${id}.log`);
    let output = '';

    const proc = spawn('claude', [
      '--permission-mode', 'bypassPermissions',
      '--print',
      prompt
    ], {
      cwd: taskDir,
      env: { ...process.env, HOME: os.homedir() },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    runningTasks.set(id, { process: proc, title, agentName });

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', async (code) => {
      runningTasks.delete(id);
      
      // Write log file
      await writeFile(logFile, output).catch(() => {});

      if (code === 0) {
        // Check for RESULT.md
        const resultFile = path.join(taskDir, 'RESULT.md');
        let resultContent = '';
        try {
          if (existsSync(resultFile)) {
            resultContent = await readFile(resultFile, 'utf-8');
            resultContent = resultContent.slice(0, 4000); // Truncate for API
          }
        } catch {}

        await apiPatch(id, {
          status: 'done',
          output: resultContent || `Agent completed. Output in ${taskDir}`,
        });
        await addLog(id, 'Task completed successfully', 'success');
        log(`Agent '${agentName}' completed: ${title}`);
      } else {
        await addLog(id, `Agent exited with error (code ${code}). Check logs at ${logFile}`, 'error');
        await apiPatch(id, { status: 'todo' }); // Put back in todo for retry
        log(`Agent '${agentName}' failed (code ${code}): ${title}`);
      }

      resolve(code);
    });

    proc.on('error', async (err) => {
      runningTasks.delete(id);
      await addLog(id, `Failed to start agent: ${err.message}`, 'error');
      log(`Failed to start agent for: ${title} - ${err.message}`);
      resolve(1);
    });
  });
}

// Main loop
async function mainLoop() {
  log(`Worker started (max_parallel=${MAX_PARALLEL}, poll=${POLL_INTERVAL / 1000}s, api=${API_URL})`);

  while (true) {
    const activeCount = runningTasks.size;
    const slots = MAX_PARALLEL - activeCount;

    if (slots > 0) {
      const data = await apiGet('/tasks');
      if (data && data.tasks) {
        const todoTasks = data.tasks
          .filter(t => t.status === 'todo' && !runningTasks.has(t.id))
          .slice(0, slots);

        for (const task of todoTasks) {
          // Don't await, run in parallel
          runTask(task).catch(err => {
            log(`Task error: ${err.message}`);
          });
          
          // Small delay between spawns
          await new Promise(r => setTimeout(r, 2000));
        }

        if (todoTasks.length > 0) {
          log(`Spawned ${todoTasks.length} agent(s). Active: ${runningTasks.size}/${MAX_PARALLEL}`);
        }
      }
    } else {
      log(`All ${MAX_PARALLEL} slots occupied. Waiting...`);
    }

    if (RUN_ONCE) {
      // Wait for all to finish
      while (runningTasks.size > 0) {
        await new Promise(r => setTimeout(r, 5000));
      }
      break;
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }

  log('Worker stopped.');
}

// Handle shutdown
process.on('SIGINT', () => {
  log('Shutting down...');
  for (const [id, info] of runningTasks) {
    log(`Killing agent for task: ${info.title}`);
    info.process.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  for (const [, info] of runningTasks) {
    info.process.kill('SIGTERM');
  }
  process.exit(0);
});

mainLoop().catch(err => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});
