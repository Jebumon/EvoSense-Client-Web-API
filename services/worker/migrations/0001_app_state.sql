CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO app_state (id, payload, updated_at)
SELECT 1, '{"companies":[],"users":[],"devices":[],"drivers":[],"assets":[],"alerts":[]}', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM app_state WHERE id = 1);
