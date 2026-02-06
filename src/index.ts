/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { isInsideTmuxSession, sendNotification, SESSION_NAME } from './tmux_utils.js';

// Create the MCP server instance
const server = new McpServer({
  name: 'ast-grep',
  version: '0.1.0',
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use the direct path to the CLI binary to avoid broken .bin symlinks in distributed node_modules
const AST_GREP_BIN = path.join(__dirname, '..', 'node_modules', '@ast-grep', 'cli', 'ast-grep');
const WORKER_SCRIPT = path.join(__dirname, 'worker.js');

/**
 * Generates a unique ID for request tracking.
 */
function getNextId(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * Helper to run ast-grep command synchronously
 */
export async function runAstGrep(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(AST_GREP_BIN, args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => (stdout += data.toString()));
    child.stderr.on('data', (data) => (stderr += data.toString()));
    child.on('close', (code) => {
      // Exit code 1 means no matches found, which is a success state for us (just empty output)
      if (code === 1) {
        resolve({ stdout: stdout || 'No matches found.', stderr, exitCode: 0 });
      } else {
        resolve({ stdout, stderr, exitCode: code });
      }
    });
    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Helper to run ast-grep command asynchronously via detached worker
 */
async function runAstGrepAsync(args: string[]): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  if (!isInsideTmuxSession()) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Async mode requires running inside tmux session '${SESSION_NAME}'.`, 
        },
      ],
      isError: true,
    };
  }
  const id = getNextId();
  const commandStr = `ast-grep ${args.join(' ')}`;
  
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const outputFile = path.join(tmpDir, `ast-grep-${id}.txt`);

  try {
    // Spawn the worker detached
    const child = spawn(process.execPath, [WORKER_SCRIPT, id, SESSION_NAME, outputFile, ...args], {
      detached: true,
      stdio: 'ignore', // Fully detached
    });
    
    child.unref(); // Allow parent to stop waiting for this child
  } catch (err: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error starting background task: ${err.message}`, 
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: `Background task [${id}] started: "${commandStr}".\nOutput will be written to: ${outputFile}\nI will notify you when it finishes.`, 
      },
    ],
  };
}

// Tool: ast_grep_search
server.registerTool(
  'ast_grep_search',
  {
    description: 'Search for code patterns using ast-grep structural search.',
    inputSchema: z.object({
      pattern: z.string().describe('AST pattern to match.'),
      lang: z.string().optional().describe('The language of the pattern (e.g., ts, js, python).'),
      paths: z.array(z.string()).optional().describe('The paths to search.'),
      globs: z.array(z.string()).optional().describe('Include or exclude file paths using glob patterns.'),
      context: z.number().int().optional().describe('Show NUM lines around each match (equivalent to -C).'),
      strictness: z.enum(['cst', 'smart', 'ast', 'relaxed', 'signature', 'template']).optional().describe('The strictness of the pattern.'),
      json: z.boolean().optional().describe('Output matches in structured JSON format.'),
      async: z.boolean().optional().default(false).describe('Run asynchronously in the background and notify via tmux. Defaults to false.'),
      extra_args: z.array(z.string()).optional().describe('Additional command line arguments to pass to ast-grep (e.g. "--debug-query=ast").'),
    }),
  },
  async ({ pattern, lang, paths, globs, context, strictness, json, async, extra_args }) => {
    const args = ['run', '--pattern', pattern];
    if (lang) args.push('--lang', lang);
    if (json) args.push('--json=pretty');
    if (context) args.push('--context', context.toString());
    if (strictness) args.push('--strictness', strictness);
    if (globs) globs.forEach((g) => args.push('--globs', g));
    if (extra_args) args.push(...extra_args);
    if (paths) args.push(...paths);

    if (async) {
      return runAstGrepAsync(args);
    }

    try {
      const { stdout, stderr, exitCode } = await runAstGrep(args);
      return {
        content: [
          {
            type: 'text',
            text: stdout || (exitCode === 0 ? 'No matches found.' : `Error: ${stderr}`),
          },
        ],
        isError: exitCode !== 0 && exitCode !== null && stdout === '',
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    }
  },
);

// Tool: ast_grep_rewrite
server.registerTool(
  'ast_grep_rewrite',
  {
    description: 'Rewrite code patterns using ast-grep structural replace.',
    inputSchema: z.object({
      pattern: z.string().describe('AST pattern to match.'),
      rewrite: z.string().describe('String to replace the matched AST node.'),
      lang: z.string().optional().describe('The language of the pattern.'),
      paths: z.array(z.string()).optional().describe('The paths to rewrite.'),
      update_all: z.boolean().optional().default(true).describe('Apply all rewrites without confirmation.'),
      async: z.boolean().optional().default(false).describe('Run asynchronously in the background and notify via tmux. Defaults to false.'),
      extra_args: z.array(z.string()).optional().describe('Additional command line arguments to pass to ast-grep.'),
    }),
  },
  async ({ pattern, rewrite, lang, paths, update_all, async, extra_args }) => {
    const args = ['run', '--pattern', pattern, '--rewrite', rewrite];
    if (lang) args.push('--lang', lang);
    if (update_all) args.push('--update-all');
    if (extra_args) args.push(...extra_args);
    if (paths) args.push(...paths);

    if (async) {
      return runAstGrepAsync(args);
    }

    try {
      const { stdout, stderr, exitCode } = await runAstGrep(args);
      return {
        content: [
          {
            type: 'text',
            text: stdout || (exitCode === 0 ? 'Rewrite completed successfully.' : `Error: ${stderr}`),
          },
        ],
        isError: exitCode !== 0 && exitCode !== null,
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    }
  },
);

// Tool: ast_grep_scan
server.registerTool(
  'ast_grep_scan',
  {
    description: 'Scan and rewrite code by configuration or inline rules.',
    inputSchema: z.object({
      config: z.string().optional().describe('Path to ast-grep root config.'),
      json: z.boolean().optional().describe('Output matches in structured JSON format.'),
      async: z.boolean().optional().default(false).describe('Run asynchronously in the background and notify via tmux. Defaults to false.'),
      extra_args: z.array(z.string()).optional().describe('Additional command line arguments to pass to ast-grep.'),
    }),
  },
  async ({ config, json, async, extra_args }) => {
    const args = ['scan'];
    if (config) args.push('--config', config);
    if (json) args.push('--json=pretty');
    if (extra_args) args.push(...extra_args);

    if (async) {
      return runAstGrepAsync(args);
    }

    try {
      const { stdout, stderr, exitCode } = await runAstGrep(args);
      return {
        content: [
          {
            type: 'text',
            text: stdout || (exitCode === 0 ? 'Scan completed with no issues.' : `Error: ${stderr}`),
          },
        ],
        isError: exitCode !== 0 && exitCode !== null && stdout === '',
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    }
  },
);

// Connect the server to the stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
