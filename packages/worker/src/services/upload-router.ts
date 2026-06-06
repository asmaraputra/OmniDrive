import type { DriveWithQuota } from '../types/index';
import { AppError } from '../middleware/error-handler';

export class UploadRouter {
  constructor(private drives: DriveWithQuota[]) {}

  /**
   * Selects the best drive account for a new upload.
   * Logic:
   * 1. If preferredDriveId is provided, use it (fail if not enough space).
   * 2. Otherwise, pick the drive with the most absolute free space.
   */
  selectDriveForUpload(fileSize: number, preferredDriveId?: string): DriveWithQuota {
    if (this.drives.length === 0) {
      throw new AppError(400, 'No connected Drive accounts available');
    }

    if (preferredDriveId) {
      const drive = this.drives.find((d) => d.id === preferredDriveId);
      if (!drive) {
        throw new AppError(404, 'Preferred drive account not found');
      }
      if (drive.freeSpace < fileSize) {
        throw new AppError(400, 'Insufficient quota in preferred drive');
      }
      return drive;
    }

    // Sort by most free space descending
    const sorted = [...this.drives].sort((a, b) => b.freeSpace - a.freeSpace);
    const bestDrive = sorted[0];

    if (bestDrive.freeSpace < fileSize) {
      throw new AppError(400, 'Insufficient overall quota for this file');
    }

    return bestDrive;
  }
}
