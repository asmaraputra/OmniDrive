import { useEffect, useState } from 'react';
import { getSharedLinks, deleteSharedLink, SharedLink } from '../lib/api';

export function SharedLinksPage() {
  const [links, setLinks] = useState<SharedLink[]>([]);

  useEffect(() => {
    getSharedLinks().then((res) => setLinks(res.links));
  }, []);

  const revoke = async (id: string) => {
    await deleteSharedLink(id);
    setLinks(links.filter(l => l.id !== id));
  };

  return (
    <div className="p-4">
      <h2>Active Shared Links</h2>
      <ul>
        {links.map(link => (
          <li key={link.id}>
            {link.id} - Views: {link.viewCount} - Downloads: {link.downloadCount}
            <button onClick={() => revoke(link.id)}>Stop Sharing</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
