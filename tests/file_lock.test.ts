import { describe, it, expect, afterEach } from 'vitest';
import { FileLock } from '../src/file_lock.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileLock', () => {
  const lockName = 'test-lock-' + Math.random().toString(36).substring(7);
  const lockPath = path.join(os.tmpdir(), `${lockName}.lock`);

  afterEach(() => {
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch (e) {}
  });

  it('should acquire a lock successfully', async () => {
    const lock = new FileLock(lockName);
    const acquired = await lock.acquire();
    expect(acquired).toBe(true);
    expect(fs.existsSync(lockPath)).toBe(true);
    lock.release();
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it('should prevent double acquisition', async () => {
    const lock1 = new FileLock(lockName);
    const lock2 = new FileLock(lockName, 10, 3); // Fast retry, few attempts

    await lock1.acquire();
    const acquired2 = await lock2.acquire();
    
    expect(acquired2).toBe(false);
    lock1.release();
  });

  it('should write PID to lock file', async () => {
    const lock = new FileLock(lockName);
    await lock.acquire();
    
    const pid = fs.readFileSync(lockPath, 'utf-8');
    expect(parseInt(pid)).toBe(process.pid);
    
    lock.release();
  });
});
