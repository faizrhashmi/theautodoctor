-- ============================================
-- Session Summaries System
-- Purpose: Unified findings/reports for chat and video sessions
-- Created: 2025-02-04
-- ============================================

-- Check if table already exists (pre-flight)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public'
                 AND table_name = 'session_summaries') THEN

    -- Create session_summaries table
    CREATE TABLE public.session_summaries (
      session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
      session_type TEXT NOT NULL CHECK (session_type IN ('chat', 'video')),

      -- Customer-facing report (plain text or markdown)
      customer_report TEXT,

      -- Structured issues for quote/RFQ prefill
      -- Example: [{"issue":"Brake pads worn","severity":"high","est_cost_range":"$200-$300"}]
      identified_issues JSONB DEFAULT '[]'::jsonb,

      -- References to existing session_files (no duplication)
      media_file_ids UUID[] DEFAULT ARRAY[]::UUID[],

      -- Timestamps
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Indexes for performance
    CREATE INDEX idx_session_summaries_type ON public.session_summaries(session_type);
    CREATE INDEX idx_session_summaries_created ON public.session_summaries(created_at DESC);

    -- Updated_at trigger
    CREATE OR REPLACE FUNCTION update_session_summaries_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER update_session_summaries_updated_at_trigger
      BEFORE UPDATE ON public.session_summaries
      FOR EACH ROW
      EXECUTE FUNCTION update_session_summaries_updated_at();

    -- RLS Policies
    ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

    -- Customers can view summaries for their sessions
    CREATE POLICY "Customers can view their session summaries"
      ON public.session_summaries
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.sessions
          WHERE sessions.id = session_summaries.session_id
          AND sessions.customer_user_id = auth.uid()
        )
      );

    -- Mechanics can view summaries for their assigned sessions
    CREATE POLICY "Mechanics can view assigned session summaries"
      ON public.session_summaries
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.sessions
          WHERE sessions.id = session_summaries.session_id
          AND sessions.mechanic_id = auth.uid()
        )
      );

    -- Mechanics can create/update summaries for their sessions
    CREATE POLICY "Mechanics can create summaries"
      ON public.session_summaries
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.sessions
          WHERE sessions.id = session_summaries.session_id
          AND sessions.mechanic_id = auth.uid()
        )
      );

    CREATE POLICY "Mechanics can update their summaries"
      ON public.session_summaries
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.sessions
          WHERE sessions.id = session_summaries.session_id
          AND sessions.mechanic_id = auth.uid()
        )
      );

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE ON public.session_summaries TO authenticated;

    -- Add comment
    COMMENT ON TABLE public.session_summaries IS
      'Unified session findings and reports linking to existing session_files and mechanic_notes';

    RAISE NOTICE 'session_summaries table created successfully';
  ELSE
    RAISE NOTICE 'session_summaries table already exists - skipping creation';
  END IF;
END $$;
