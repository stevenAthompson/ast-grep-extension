import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runAstGrep } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ast-grep Integration', () => {
  const testFile = 'integration-test.js';
  const testContent = `
    function hello() {
      console.log("Hello");
    }
  `;

  beforeAll(() => {
    fs.writeFileSync(testFile, testContent);
  });

  afterAll(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('should find patterns in a file', async () => {
    const args = ['run', '--pattern', 'console.log($MSG)', testFile, '--json=pretty'];
    const { stdout, exitCode } = await runAstGrep(args);
    
    expect(exitCode).toBe(0);
    const results = JSON.parse(stdout);
    expect(results).toHaveLength(1);
    expect(results[0].text).toContain('console.log("Hello")');
  });

  it('should rewrite patterns in a file', async () => {
    const rewriteFile = 'rewrite-test.js';
    fs.writeFileSync(rewriteFile, testContent);
    
    const args = ['run', '--pattern', 'console.log($MSG)', '--rewrite', 'log($MSG)', rewriteFile, '--update-all'];
    const { exitCode } = await runAstGrep(args);
    
    expect(exitCode).toBe(0);
    
    const newContent = fs.readFileSync(rewriteFile, 'utf-8');
    expect(newContent).toContain('log("Hello")');
    expect(newContent).not.toContain('console.log("Hello")');
    
    fs.unlinkSync(rewriteFile);
  });

  it('should return no matches found for missing pattern', async () => {
    const args = ['run', '--pattern', 'nonExistentPattern($MSG)', testFile];
    const { stdout, exitCode } = await runAstGrep(args);
    
    expect(exitCode).toBe(0); // Wrapper should return 0 for "no matches"
    expect(stdout).toContain('No matches found');
  });
});