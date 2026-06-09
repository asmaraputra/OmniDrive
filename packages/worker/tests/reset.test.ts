import { describe, it, expect } from 'vitest';
import { promptUser } from '../scripts/reset.mjs';

describe('reset.mjs prompt logic', () => {
  it('should return true if not remote', async () => {
    const result = await promptUser(false);
    expect(result).toBe(true);
  });
});
