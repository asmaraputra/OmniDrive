/** Google omits storageQuota.limit for unlimited accounts; use a practical ceiling for routing. */
export const UNLIMITED_DRIVE_QUOTA_BYTES = 1_099_511_627_776; // 1 TiB

export function parseStorageQuota(limit?: string, usage?: string): { total: number; used: number } {
  const used = parseInt(usage ?? '0', 10);
  const total = limit != null && limit !== '' ? parseInt(limit, 10) : UNLIMITED_DRIVE_QUOTA_BYTES;
  return { total, used };
}

export function computeDriveQuota(
  stored: { totalQuota: number; usedQuota: number },
  live?: { total: number; used: number } | null
): { totalQuota: number; usedQuota: number; freeSpace: number; usagePercent: number } {
  const total = live?.total ?? stored.totalQuota;
  const used = live?.used ?? stored.usedQuota;
  const effectiveTotal = total > 0 ? total : UNLIMITED_DRIVE_QUOTA_BYTES;
  const freeSpace = Math.max(0, effectiveTotal - used);
  const usagePercent = effectiveTotal > 0 ? (used / effectiveTotal) * 100 : 0;
  return { totalQuota: effectiveTotal, usedQuota: used, freeSpace, usagePercent };
}