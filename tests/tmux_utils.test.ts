import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isInsideTmuxSession, SESSION_NAME, sendNotification } from '../src/tmux_utils.js';
import * as cp from 'child_process';
import { FileLock } from '../src/file_lock.js';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock FileLock
vi.mock('../src/file_lock.js', () => {
  const MockFileLock = vi.fn();
  MockFileLock.prototype.acquire = vi.fn().mockResolvedValue(true);
  MockFileLock.prototype.release = vi.fn();
  return { FileLock: MockFileLock };
});

describe('tmux_utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Ensure NODE_ENV is NOT test for sendNotification logic if we want to test lock?
    // Wait, if NODE_ENV is test, waitForStability returns true immediately.
    // sendNotification still creates the lock.
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('isInsideTmuxSession returns false if TMUX env var is missing', () => {
    delete process.env.TMUX;
    expect(isInsideTmuxSession()).toBe(false);
  });

  it('isInsideTmuxSession returns true if TMUX set and session name matches', () => {
    process.env.TMUX = '/tmp/tmux-1000/default,1234,0';
    vi.mocked(cp.execSync).mockReturnValue(SESSION_NAME + '\n');
    
    expect(isInsideTmuxSession()).toBe(true);
    expect(cp.execSync).toHaveBeenCalledWith('tmux display-message -p "#S"', expect.anything());
  });

  it('isInsideTmuxSession returns false if session name differs', () => {
    process.env.TMUX = 'something';
    vi.mocked(cp.execSync).mockReturnValue('other-session\n');
    expect(isInsideTmuxSession()).toBe(false);
  });

  it('isInsideTmuxSession returns false if tmux command fails', () => {
    process.env.TMUX = 'something';
    vi.mocked(cp.execSync).mockImplementation(() => {
      throw new Error('tmux not found');
    });
    expect(isInsideTmuxSession()).toBe(false);
  });

  it('sendNotification uses the shared "gemini-tmux-notification" lock to prevent conflicts', async () => {
    // We strictly want to verify the lock name is 'gemini-tmux-notification'
    // This protects against regression where it was renamed to 'gemini-ast-grep-notification'
    await sendNotification('session:0.0', 'test message');
    
    expect(FileLock).toHaveBeenCalledWith('gemini-tmux-notification', expect.any(Number), expect.any(Number));
  });
});