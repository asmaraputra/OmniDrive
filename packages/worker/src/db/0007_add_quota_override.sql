-- Manual total quota override for drives whose real capacity Google's API
-- does not expose (Google Workspace pooled storage, service accounts).
-- When NULL/0 the system falls back to live storageQuota.limit, then to the
-- unlimited ceiling constant. Populated by the user once via the UI.
ALTER TABLE drive_accounts ADD COLUMN quota_override INTEGER;
