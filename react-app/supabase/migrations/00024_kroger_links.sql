-- A person's Kroger account link (OAuth) for adding items to their Kroger
-- cart. The tokens are encrypted by the server (AES-256-GCM, key derived from
-- the Kroger client secret), so this row is useless to anyone without the
-- server's secret, including the person themselves.
CREATE TABLE IF NOT EXISTS kroger_links (
  user_id UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token_enc TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE kroger_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY kroger_links_own_select ON kroger_links FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY kroger_links_own_insert ON kroger_links FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY kroger_links_own_update ON kroger_links FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY kroger_links_own_delete ON kroger_links FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER update_kroger_links_updated_at BEFORE UPDATE ON kroger_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
