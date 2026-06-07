const fs = require('fs');

const filePath = 'packages/web/src/lib/api.ts';
const content = fs.readFileSync(filePath, 'utf-8');

const interfaceIndex = content.indexOf('export interface SharedLink {');
if (interfaceIndex !== -1) {
  const baseContent = content.substring(0, interfaceIndex);
  const newContent = baseContent + `export interface SharedLink {
  id: string;
  userId: string;
  targetType: 'file' | 'folder';
  targetId: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface SharedMetaResponse {
  type?: 'file' | 'folder';
  target?: import('../types').FileEntry;
  targetId?: string;
  requiresPassword?: boolean;
}

export const createSharedLink = async (targetType: 'file' | 'folder', targetId: string, password?: string, expiresAt?: string) => {
  return request<{ id: string; url: string }>('/api/shared', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId, password, expiresAt }),
  });
};

export const getSharedLinks = async () => {
  return request<{ links: SharedLink[] }>('/api/shared');
};

export const deleteSharedLink = async (id: string) => {
  return request<{ success: boolean }>(\`/api/shared/\${id}\`, { method: 'DELETE' });
};

export const getSharedMeta = async (id: string) => {
  try {
    return await request<SharedMetaResponse>(\`/api/shared/\${id}/meta\`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { requiresPassword: true };
    }
    throw error;
  }
};

export const verifySharedPassword = async (id: string, password: string) => {
  return request<{ success: boolean }>(\`/api/shared/\${id}/verify\`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  }).catch((error) => {
    if (error instanceof ApiError && error.status === 401) {
      throw new Error('Invalid password');
    }
    throw error;
  });
};
`;
  fs.writeFileSync(filePath, newContent);
}
