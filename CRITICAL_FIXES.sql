-- CRITICAL RLS POLICY FIXES FOR SIGN-UP FLOWS

-- 1. Add mechanics RLS policies (currently missing!)
CREATE POLICY "Mechanics can view own profile"
  ON public.mechanics FOR SELECT
  USING (id IN (SELECT mechanic_id FROM public.mechanic_sessions WHERE expires_at > now()));

CREATE POLICY "Admins manage mechanics"
  ON public.mechanics FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Fix mechanic_documents broken RLS
DROP POLICY IF EXISTS "Mechanics can view own documents" ON public.mechanic_documents;
CREATE POLICY "Mechanics can view own documents"
  ON public.mechanic_documents FOR SELECT
  USING (mechanic_id IN (SELECT id FROM public.mechanics m WHERE EXISTS (SELECT 1 FROM public.mechanic_sessions ms WHERE ms.mechanic_id = m.id AND ms.expires_at > now())));

-- 3. Add missing INSERT policies
CREATE POLICY "Users create organizations"
  ON organizations FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users invite members"
  ON organization_members FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'));

-- 4. Critical indexes
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_active ON public.profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS mechanics_user_id_idx ON public.mechanics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS org_members_invite_idx ON organization_members(invite_code) WHERE status = 'pending';
