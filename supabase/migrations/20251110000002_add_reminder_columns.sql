-- Add email reminder tracking columns to sessions table
-- These columns track which reminder emails have been sent

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_15min_sent BOOLEAN DEFAULT FALSE;

-- Add indexes for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_sessions_reminder_24h ON sessions(scheduled_for, status, reminder_24h_sent)
  WHERE status = 'scheduled' AND reminder_24h_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_sessions_reminder_1h ON sessions(scheduled_for, status, reminder_1h_sent)
  WHERE status = 'scheduled' AND reminder_1h_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_sessions_reminder_15min ON sessions(scheduled_for, status, reminder_15min_sent)
  WHERE status = 'scheduled' AND reminder_15min_sent = FALSE;

-- Add comments
COMMENT ON COLUMN sessions.reminder_24h_sent IS 'True if 24-hour reminder email has been sent';
COMMENT ON COLUMN sessions.reminder_1h_sent IS 'True if 1-hour reminder email has been sent';
COMMENT ON COLUMN sessions.reminder_15min_sent IS 'True if 15-minute waiver reminder email has been sent';
