import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Parse a human size string like "5 TB", "500GB", "1.5TB" into bytes. Returns null when unparseable. */
export function parseSizeToBytes(input: string): number | null {
  const m = input.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)$/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const units: Record<string, number> = { b: 0, kb: 1, mb: 2, gb: 3, tb: 4 };
  return Math.round(value * Math.pow(1024, units[m[2]]));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}



export function getDriveColor(index: number): string {
  const colors = [
    'var(--drive-1)',
    'var(--drive-2)',
    'var(--drive-3)',
    'var(--drive-4)',
    'var(--drive-5)',
  ];
  return colors[index % colors.length];
}

export function getQuotaLevel(percent: number): 'normal' | 'warning' | 'danger' {
  if (percent >= 90) return 'danger';
  if (percent >= 75) return 'warning';
  return 'normal';
}
