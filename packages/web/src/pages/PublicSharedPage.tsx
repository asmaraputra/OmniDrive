import { useEffect, useState, useCallback, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedMeta, verifySharedPassword, SharedMetaResponse } from '../lib/api';
import { getFileIcon, formatFileSize } from '../lib/utils';
import { Lock, Download, AlertCircle, Loader2 } from 'lucide-react';

export function PublicSharedPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<SharedMetaResponse | null>(null);
  const [error, setError] = useState('');
  
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const loadMeta = useCallback(async (skipLoadingState = false) => {
    if (!id) {
      setLoading(false);
      setError('Invalid link ID');
      return;
    }
    try {
      if (!skipLoadingState) setLoading(true);
      setError('');
      const data = await getSharedMeta(id);
      setMeta(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to load shared link');
    } finally {
      if (!skipLoadingState) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !password) return;
    
    try {
      setVerifying(true);
      setPasswordError('');
      await verifySharedPassword(id, password);
      await loadMeta(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPasswordError(message || 'Incorrect password');
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = () => {
    if (!id) return;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/api/shared/${id}/download`;
  };

  const renderContent = (): ReactNode => {
    if (loading) {
      return (
        <div className="shared-card">
          <Loader2 className="animate-spin loading-icon" size={48} />
          <p className="loading-text">Loading...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="shared-card error">
          <AlertCircle size={48} className="error-icon" />
          <h2 className="shared-title">Error</h2>
          <p className="shared-subtitle">{error}</p>
        </div>
      );
    }

    if (meta?.requiresPassword) {
      return (
        <div className="shared-card">
          <div className="shared-header">
            <Lock size={48} className="lock-icon" />
            <h2 className="shared-title">Password Required</h2>
            <p className="shared-subtitle">This shared link is protected by a password.</p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            
            {passwordError && (
              <p className="error-text">{passwordError}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full mt-sm"
              disabled={verifying || !password}
            >
              {verifying && <Loader2 className="animate-spin icon-left" size={16} />}
              Unlock
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="shared-card text-center">
        {meta?.type === 'folder' ? (
          <div className="shared-header">
            <div className="file-icon-large">📁</div>
            <h2 className="shared-title">Shared Folder</h2>
            <p className="shared-subtitle">Folder view is not supported yet.</p>
          </div>
        ) : (
          <div className="shared-header">
            <div className="file-icon-large">{getFileIcon(meta?.target?.mimeType || null)}</div>
            <h2 className="shared-title break-words">{meta?.target?.name || 'Unknown File'}</h2>
            {typeof meta?.target?.size === 'number' && (
              <p className="shared-subtitle">{formatFileSize(meta.target.size)}</p>
            )}
          </div>
        )}

        <button
          onClick={handleDownload}
          className="btn btn-primary btn-full mt-lg"
        >
          <Download size={20} className="icon-left" />
          Download
        </button>
      </div>
    );
  };

  return (
    <div className="shared-page">
      {renderContent()}
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .shared-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
    padding: var(--space-lg);
  }

  .shared-card {
    background: var(--bg-secondary);
    padding: var(--space-2xl);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    max-width: 480px;
    width: 100%;
    border: 1px solid var(--border-default);
    text-align: center;
  }

  .shared-card.error {
    border-color: var(--accent-danger);
  }

  .shared-header {
    margin-bottom: var(--space-lg);
  }

  .shared-title {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--space-xs);
  }

  .shared-subtitle {
    color: var(--text-secondary);
    font-size: var(--font-size-md);
  }

  .file-icon-large {
    font-size: 5rem;
    margin-bottom: var(--space-md);
    line-height: 1;
  }

  .loading-icon {
    margin: 0 auto var(--space-md) auto;
    color: var(--accent-primary);
  }

  .loading-text {
    color: var(--text-secondary);
    font-size: var(--font-size-md);
  }

  .error-icon {
    margin: 0 auto var(--space-md) auto;
    color: var(--accent-danger);
  }

  .lock-icon {
    margin: 0 auto var(--space-md) auto;
    color: var(--accent-primary);
  }

  .error-text {
    color: var(--accent-danger);
    font-size: var(--font-size-sm);
    margin-top: var(--space-xs);
    text-align: left;
  }

  .btn-full {
    width: 100%;
  }

  .mt-sm {
    margin-top: var(--space-md);
  }

  .mt-lg {
    margin-top: var(--space-xl);
  }

  .icon-left {
    margin-right: var(--space-sm);
  }

  .break-words {
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .form-group {
    text-align: left;
    margin-bottom: var(--space-sm);
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
