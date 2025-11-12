-- Email Queue System Migration
-- Created: 2025-11-11
-- Purpose: Supabase-based email queue for reliable email delivery

-- Create email queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  from_email TEXT DEFAULT 'noreply@theautodoctor.ca',
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  resend_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
  ON email_queue(status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_priority
  ON email_queue(priority DESC, scheduled_for ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_created_at
  ON email_queue(created_at DESC);

-- Add RLS policies
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access email queue (security)
CREATE POLICY "Service role full access to email_queue"
  ON email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- Add comments for documentation
COMMENT ON TABLE email_queue IS 'Queue for outgoing emails with retry logic';
COMMENT ON COLUMN email_queue.priority IS 'Priority 1-10 (1=highest, 10=lowest)';
COMMENT ON COLUMN email_queue.status IS 'Email processing status: pending, sending, sent, failed';
COMMENT ON COLUMN email_queue.attempts IS 'Number of send attempts made';
COMMENT ON COLUMN email_queue.max_attempts IS 'Maximum retry attempts before marking as failed';
COMMENT ON COLUMN email_queue.scheduled_for IS 'When to send this email (supports delayed sends)';
COMMENT ON COLUMN email_queue.resend_id IS 'Resend API message ID for tracking';
