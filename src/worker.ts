/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { spawn } from 'child_process';
import path from 'path';
import { sendNotification, SESSION_NAME } from './tmux_utils.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AST_GREP_BIN = path.join(__dirname, '..', 'node_modules', '.bin', 'ast-grep');

// Arguments: node worker.js <id> <session_name> <...ast-grep-args>
const args = process.argv.slice(2);
if (args.length < 2) {
  process.exit(1);
}

const id = args[0];
const sessionName = args[1];
const astGrepArgs = args.slice(2);

async function main() {
  const child = spawn(AST_GREP_BIN, astGrepArgs);
  
  let output = '';
  const MAX_OUTPUT_LENGTH = 500;

  child.stdout.on('data', (data) => {
    if (output.length < MAX_OUTPUT_LENGTH) {
      output += data.toString();
    }
  });

  child.stderr.on('data', (data) => {
    if (output.length < MAX_OUTPUT_LENGTH) {
      output += data.toString();
    }
  });

  child.on('close', async (code) => {
    try {
      const codeStr = `(${code})`;
      const target = `${sessionName}:0.0`; 
      
      let outStr = output.trim();
      if (outStr.length > MAX_OUTPUT_LENGTH) {
        outStr = outStr.substring(0, MAX_OUTPUT_LENGTH) + '... (truncated)';
      }

      const completionMessage = `[${id}] ast-grep finished ${codeStr}. Output:\n${outStr}`;
      
      // This call blocks, but it's fine because we are in a detached worker
      await sendNotification(target, completionMessage);
    } catch (err) {
      // Ignore errors in worker
    }
  });

  child.on('error', async (err) => {
    try {
      const target = `${sessionName}:0.0`;
      const errorMessage = `[${id}] ast-grep failed to start: ${err.message}`;
      await sendNotification(target, errorMessage);
    } catch (ignore) {}
  });
}

main();
