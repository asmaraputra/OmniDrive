import { describe, it, expect } from 'vitest';
import { parseStorageQuota, computeDriveQuota, UNLIMITED_DRIVE_QUOTA_BYTES } from '../src/lib/storage-quota';

describe('parseStorageQuota', () => {
  it('parses limited quota from Google response', () => {
    expect(parseStorageQuota('16106127360', '1073741824')).toEqual({
      total: 16106127360,
      used: 1073741824,
    });
  });

  it('treats missing limit as unlimited storage', () => {
    expect(parseStorageQuota(undefined, '5000')).toEqual({
      total: UNLIMITED_DRIVE_QUOTA_BYTES,
      used: 5000,
    });
  });
});

describe('computeDriveQuota', () => {
  it('uses live quota when available', () => {
    expect(computeDriveQuota({ totalQuota: 0, usedQuota: 0 }, { total: 1000, used: 200 })).toEqual({
      totalQuota: 1000,
      usedQuota: 200,
      freeSpace: 800,
      usagePercent: 20,
    });
  });

  it('treats unknown stored quota as unlimited for upload routing', () => {
    expect(computeDriveQuota({ totalQuota: 0, usedQuota: 0 })).toEqual({
      totalQuota: UNLIMITED_DRIVE_QUOTA_BYTES,
      usedQuota: 0,
      freeSpace: UNLIMITED_DRIVE_QUOTA_BYTES,
      usagePercent: 0,
    });
  });
});