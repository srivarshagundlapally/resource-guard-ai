
-- Clear demo chat data so user_id can be converted to uuid
DELETE FROM public.chat_messages;
DELETE FROM public.chat_sessions;

ALTER TABLE public.chat_sessions ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE public.chat_sessions ALTER COLUMN user_id TYPE uuid USING NULL;
ALTER TABLE public.chat_sessions ALTER COLUMN user_id SET NOT NULL;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'anomalies','buildings','rooms','electricity_consumption','internet_consumption',
    'water_consumption','predictions','recommendations','reports','root_cause_analysis','model_registry'
  ]) LOOP
    EXECUTE format('CREATE POLICY "Authenticated read" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "Authenticated insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Authenticated update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Authenticated delete" ON public.%I FOR DELETE TO authenticated USING (true)', t);
  END LOOP;
END$$;

CREATE POLICY "Users read own sessions" ON public.chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.chat_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.chat_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users read own messages" ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own messages" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users update own messages" ON public.chat_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users delete own messages" ON public.chat_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()));
