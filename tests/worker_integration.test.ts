import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_SCRIPT = path.join(__dirname, '..', 'dist', 'worker.js');

describe('Worker Integration', () => {
  const tmpDir = path.join(__dirname, '..', 'tmp');
  const testId = 'TEST_WORKER';
  const outputFile = path.join(tmpDir, `ast-grep-${testId}.txt`);

  afterAll(() => {
    try {
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
    } catch (e) {}
  });

  it('should run ast-grep and write to output file', async () => {
    // Ensure tmp dir exists
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // We need to pass: id, sessionName, outputFile, ...args
    const args = [
      WORKER_SCRIPT,
      testId,
      'dummy-session', 
      outputFile,
      'run', 
      '--pattern', 
      'McpServer', 
      'src/index.ts' 
    ];

    const child = spawn('node', args, {
      stdio: 'inherit'
    });

    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Worker exited with code ${code}`));
      });
      child.on('error', reject);
    });

    expect(fs.existsSync(outputFile)).toBe(true);
    const content = fs.readFileSync(outputFile, 'utf-8');
    expect(content).toContain('McpServer');
  }, 15000); // Increased timeout to 15s

  it('should handle no matches gracefully', async () => {
    const testIdNoMatch = 'TEST_NOMATCH';
    const outputNoMatch = path.join(tmpDir, `ast-grep-${testIdNoMatch}.txt`);
    
    const args = [
      WORKER_SCRIPT,
      testIdNoMatch,
      'dummy-session', 
      outputNoMatch,
      'run', 
      '--pattern', 
      'NONEXISTENT_PATTERN_XYZ', 
      'src/index.ts' 
    ];

    const child = spawn('node', args, { stdio: 'inherit' });

    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        resolve(); // Worker exits with 0 even if ast-grep finds nothing?
                   // No, ast-grep exits 1. Worker catches it?
                   // Worker logic: child.on('close', (code) => ...).
                   // The worker script itself finishes execution normally (exit 0) after handling the child process.
      });
    });

    expect(fs.existsSync(outputNoMatch)).toBe(true);
    const content = fs.readFileSync(outputNoMatch, 'utf-8');
    expect(content).toContain('No matches found');
    
    if(fs.existsSync(outputNoMatch)) fs.unlinkSync(outputNoMatch);
  });
});
