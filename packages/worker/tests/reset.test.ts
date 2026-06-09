import { describe, it, expect, vi } from 'vitest';
import { promptUser, resetD1 } from '../scripts/reset.mjs';

describe('reset.mjs prompt logic', () => {
  it('should return true if not remote', async () => {
    const result = await promptUser(false);
    expect(result).toBe(true);
  });
});

describe('reset.mjs D1 logic', () => {
  it('should execute wrangler d1 commands with correct flag', () => {
    const execSyncMock = vi.fn();
    resetD1(execSyncMock, '--local');
    
    expect(execSyncMock).toHaveBeenCalledTimes(2);
    expect(execSyncMock.mock.calls[0][0]).toContain('d1 execute omnidrive --local --command');
    expect(execSyncMock.mock.calls[0][0]).toContain('delete from sqlite_master');
    expect(execSyncMock.mock.calls[1][0]).toContain('d1 execute omnidrive --local --file=src/db/schema.sql');
  });
});
