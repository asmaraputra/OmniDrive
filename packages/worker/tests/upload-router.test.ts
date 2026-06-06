import { describe, it, expect } from 'vitest';
import { UploadRouter } from '../src/services/upload-router';
import type { DriveWithQuota } from '../src/types';

describe('UploadRouter', () => {
  const mockDrives: DriveWithQuota[] = [
    {
      id: 'drive1',
      userId: 'user1',
      googleAccountId: 'g1',
      email: 'a@gmail.com',
      name: 'Drive A',
      type: 'oauth',
      isPrimary: true,
      rootFolderId: null,
      totalQuota: 1000,
      usedQuota: 800,
      freeSpace: 200,
      usagePercent: 80,
      quotaUpdatedAt: null,
      createdAt: '',
    },
    {
      id: 'drive2',
      userId: 'user1',
      googleAccountId: 'g2',
      email: 'b@gmail.com',
      name: 'Drive B',
      type: 'oauth',
      isPrimary: false,
      rootFolderId: null,
      totalQuota: 1000,
      usedQuota: 400,
      freeSpace: 600,
      usagePercent: 40,
      quotaUpdatedAt: null,
      createdAt: '',
    },
  ];

  it('selects the drive with the most free space when no preference is given', () => {
    const router = new UploadRouter(mockDrives);
    const selected = router.selectDriveForUpload(100);
    expect(selected.id).toBe('drive2');
  });

  it('respects preferredDriveId if provided and has enough space', () => {
    const router = new UploadRouter(mockDrives);
    const selected = router.selectDriveForUpload(100, 'drive1');
    expect(selected.id).toBe('drive1');
  });

  it('throws if preferredDriveId does not have enough space', () => {
    const router = new UploadRouter(mockDrives);
    expect(() => router.selectDriveForUpload(300, 'drive1')).toThrowError(
      'Insufficient quota in preferred drive'
    );
  });

  it('throws if all drives are full', () => {
    const router = new UploadRouter(mockDrives);
    expect(() => router.selectDriveForUpload(700)).toThrowError(
      'Insufficient overall quota for this file'
    );
  });
});
