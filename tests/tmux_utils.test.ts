import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isInsideTmuxSession, SESSION_NAME } from '../src/tmux_utils.js';
import * as cp from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('tmux_utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
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
    // Mock execSync to return correct session name
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
});
