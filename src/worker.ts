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

// Arguments: node worker.js <id> <session_name> <output_file> <...ast-grep-args>
const args = process.argv.slice(2);
if (args.length < 3) {
  process.exit(1);
}

const id = args[0];
const sessionName = args[1];
const outputFile = args[2];
const astGrepArgs = args.slice(3);

import * as fs from 'fs';

async function main() {
  const child = spawn(AST_GREP_BIN, astGrepArgs);
  
  const fileStream = fs.createWriteStream(outputFile);
  let output = '';
  const MAX_OUTPUT_LENGTH = 200; // Keep truncated preview short

  child.stdout.on('data', (data) => {
    fileStream.write(data);
    if (output.length < MAX_OUTPUT_LENGTH) {
      output += data.toString();
    }
  });

  child.stderr.on('data', (data) => {
    fileStream.write(data);
    if (output.length < MAX_OUTPUT_LENGTH) {
      output += data.toString();
    }
  });

  child.on('close', async (code) => {
    fileStream.end();
    try {
      const codeStr = `(${code})`;
      const target = `${sessionName}:0.0`; 
      
      let outStr = output.trim();
      if (outStr.length >= MAX_OUTPUT_LENGTH) {
        outStr += '...';
      }

      const completionMessage = `[${id}] ast-grep finished with exit code ${codeStr}. Results saved to: ${outputFile}`;
      
      await sendNotification(target, completionMessage);
    } catch (err) {
      // Ignore errors in worker
    }
  });

  child.on('error', async (err) => {
    fileStream.end();
    try {
      const target = `${sessionName}:0.0`;
      const errorMessage = `[${id}] ast-grep failed to start: ${err.message}`;
      await sendNotification(target, errorMessage);
    } catch (ignore) {}
  });
}

main();
