-- D1 table for form leads. Create once with:
--   npx wrangler d1 execute ormond-leads --remote --file=schema.sql
-- or paste into the D1 console in the Cloudflare dashboard.
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  page TEXT
);
