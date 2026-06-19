
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.buildings (
  id SERIAL PRIMARY KEY,
  building_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  address TEXT,
  total_floors INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rooms (
  id SERIAL PRIMARY KEY,
  building_id VARCHAR(20) REFERENCES public.buildings(building_id),
  floor_no INTEGER NOT NULL,
  room_no INTEGER NOT NULL,
  room_type VARCHAR(50) DEFAULT 'general',
  capacity INTEGER,
  UNIQUE (building_id, floor_no, room_no)
);

CREATE TABLE IF NOT EXISTS public.water_consumption (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  building_id VARCHAR(20) NOT NULL,
  floor_no INTEGER NOT NULL,
  room_no INTEGER NOT NULL,
  water_usage_liters NUMERIC(10,3) NOT NULL,
  anomaly_label VARCHAR(30) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_water_ts ON public.water_consumption (timestamp);
CREATE INDEX IF NOT EXISTS idx_water_bldg ON public.water_consumption (building_id);

CREATE TABLE IF NOT EXISTS public.electricity_consumption (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  building_id VARCHAR(20) NOT NULL,
  floor_no INTEGER NOT NULL,
  room_no INTEGER NOT NULL,
  electricity_usage_kwh NUMERIC(10,4) NOT NULL,
  anomaly_label VARCHAR(30) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_elec_ts ON public.electricity_consumption (timestamp);
CREATE INDEX IF NOT EXISTS idx_elec_bldg ON public.electricity_consumption (building_id);

CREATE TABLE IF NOT EXISTS public.internet_consumption (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  building_id VARCHAR(20) NOT NULL,
  floor_no INTEGER NOT NULL,
  room_no INTEGER NOT NULL,
  internet_usage_gb NUMERIC(10,4) NOT NULL,
  anomaly_label VARCHAR(30) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_net_ts ON public.internet_consumption (timestamp);
CREATE INDEX IF NOT EXISTS idx_net_bldg ON public.internet_consumption (building_id);

CREATE TABLE IF NOT EXISTS public.anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  building_id VARCHAR(20) NOT NULL,
  floor_no INTEGER NOT NULL,
  room_no INTEGER NOT NULL,
  anomaly_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  score NUMERIC(6,4),
  description TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anomaly_bldg ON public.anomalies (building_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_ts ON public.anomalies (timestamp);

CREATE TABLE IF NOT EXISTS public.root_cause_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anomaly_id UUID REFERENCES public.anomalies(id) ON DELETE CASCADE,
  cause VARCHAR(200) NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  building_id VARCHAR(20) NOT NULL,
  floor_no INTEGER,
  room_no INTEGER,
  predicted_value NUMERIC(12,4) NOT NULL,
  actual_value NUMERIC(12,4),
  model_name VARCHAR(50),
  rmse NUMERIC(10,4),
  mae NUMERIC(10,4),
  r2_score NUMERIC(6,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anomaly_id UUID REFERENCES public.anomalies(id),
  resource_type VARCHAR(20) NOT NULL,
  building_id VARCHAR(20) NOT NULL,
  floor_no INTEGER,
  room_no INTEGER,
  action TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  priority INTEGER NOT NULL,
  estimated_saving NUMERIC(10,3),
  saving_unit VARCHAR(10),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type VARCHAR(30) NOT NULL,
  resource_type VARCHAR(20),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  content JSONB NOT NULL,
  vector_id VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.model_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name VARCHAR(100) NOT NULL,
  resource_type VARCHAR(20) NOT NULL,
  task VARCHAR(30) NOT NULL,
  version VARCHAR(20),
  rmse NUMERIC(10,4),
  mae NUMERIC(10,4),
  r2_score NUMERIC(6,4),
  artifact_path TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grants: demo monitoring dashboard, no auth — anon has full access
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'buildings','rooms','water_consumption','electricity_consumption',
    'internet_consumption','anomalies','root_cause_analysis','predictions',
    'recommendations','reports','chat_sessions','chat_messages','model_registry'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY "Public read" ON public.%I FOR SELECT USING (true)$p$, t);
    EXECUTE format($p$CREATE POLICY "Public insert" ON public.%I FOR INSERT WITH CHECK (true)$p$, t);
    EXECUTE format($p$CREATE POLICY "Public update" ON public.%I FOR UPDATE USING (true) WITH CHECK (true)$p$, t);
    EXECUTE format($p$CREATE POLICY "Public delete" ON public.%I FOR DELETE USING (true)$p$, t);
  END LOOP;
END $$;

-- Grant sequence usage for SERIAL/BIGSERIAL inserts from anon
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

INSERT INTO public.buildings (building_id, name, total_floors) VALUES
  ('BLK-A', 'Block A – Academic Wing', 4),
  ('BLK-B', 'Block B – Hostel', 4),
  ('BLK-C', 'Block C – Admin & Library', 4),
  ('BLK-D', 'Block D – Labs', 4)
ON CONFLICT (building_id) DO NOTHING;
