import { Folder, AlertTriangle, Loader2, Share2, MoreVertical } from 'lucide-react';
import type { DriveFolder } from '../types';
import { useState } from 'react';

interface DriveFolderCardProps {
  folder: DriveFolder;
  driveColor: string;
  driveEmail: string;
  hasError?: boolean;
  isSyncing?: boolean;
  onClick: () => void;
  onShare?: () => void;
  isShared?: boolean;
}

export function DriveFolderCard({ folder, driveColor, driveEmail, hasError, isSyncing, onClick, onShare, isShared }: DriveFolderCardProps) {
  const initial = driveEmail ? driveEmail.charAt(0).toUpperCase() : '?';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`folder-card ${!folder.isSynced ? 'unsynced' : ''} ${hasError ? 'error' : ''}`}
      onClick={onClick}
      title={!folder.isSynced ? 'Click to load folder contents' : folder.name}
    >
      <div className="account-badge" style={{ backgroundColor: `color-mix(in srgb, ${driveColor} 20%, transparent)`, color: driveColor, borderColor: `color-mix(in srgb, ${driveColor} 40%, transparent)` }} title={driveEmail}>
        {initial}
      </div>
      
      <span className="folder-icon">
        {isSyncing ? (
          <Loader2 size={20} className="dfb-spinner" />
        ) : hasError ? (
          <AlertTriangle size={20} color="var(--accent-warning)" />
        ) : (
          <Folder size={20} />
        )}
      </span>
      <span className="folder-name truncate">
        {folder.name}
        {isShared && <span className="file-badge" style={{ background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)', marginLeft: 8, padding: '2px 6px', fontSize: 10, borderRadius: 10 }} title="Shared via Public Link"><Share2 size={10} style={{ display: 'inline', marginRight: 2, marginBottom: -1 }} /> Shared</span>}
      </span>
      
      {!folder.isSynced && !hasError && !isSyncing && (
        <span className="unsynced-dot" title="Not yet loaded" />
      )}

      {onShare && (
        <div className="file-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="file-card-menu">
              <button
                className="file-card-menu-item"
                onClick={() => {
                  onShare();
                  setMenuOpen(false);
                }}
              >
                <Share2 size={14} /> Share
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
