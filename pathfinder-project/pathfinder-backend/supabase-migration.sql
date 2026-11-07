-- ============================================================
-- PATHFINDER — Database Migration Script (v2)
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ============================================================

-- 1. BẢNG PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT        NOT NULL DEFAULT '',
  headline      TEXT,
  goal          TEXT,
  level         TEXT,
  hours_per_day INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. BẢNG ROADMAPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roadmaps (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  goal        TEXT        NOT NULL,
  total_weeks INTEGER     NOT NULL DEFAULT 4,
  status      TEXT        NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roadmaps_user_id_idx ON public.roadmaps(user_id);
CREATE INDEX IF NOT EXISTS roadmaps_status_idx  ON public.roadmaps(user_id, status);

-- 3. BẢNG TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id   UUID        NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  week_number  INTEGER     NOT NULL,
  week_theme   TEXT,
  day_label    TEXT        NOT NULL,
  topic        TEXT        NOT NULL,
  duration_min INTEGER     NOT NULL DEFAULT 60,
  description  TEXT        DEFAULT '',
  resources    JSONB       DEFAULT '[]'::jsonb,
  is_completed BOOLEAN     NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_roadmap_id_idx  ON public.tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS tasks_week_number_idx ON public.tasks(roadmap_id, week_number);
CREATE INDEX IF NOT EXISTS tasks_completed_idx   ON public.tasks(roadmap_id, is_completed);

-- 4. BẢNG RESOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tag        TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  url        TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'article',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resources_tag_idx ON public.resources(tag);

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- --- PROFILES ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- --- ROADMAPS ---
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roadmaps_select_own" ON public.roadmaps;
CREATE POLICY "roadmaps_select_own"
  ON public.roadmaps FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "roadmaps_insert_own" ON public.roadmaps;
CREATE POLICY "roadmaps_insert_own"
  ON public.roadmaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "roadmaps_update_own" ON public.roadmaps;
CREATE POLICY "roadmaps_update_own"
  ON public.roadmaps FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "roadmaps_delete_own" ON public.roadmaps;
CREATE POLICY "roadmaps_delete_own"
  ON public.roadmaps FOR DELETE
  USING (auth.uid() = user_id);

-- --- TASKS ---
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmaps r
      WHERE r.id = tasks.roadmap_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roadmaps r
      WHERE r.id = tasks.roadmap_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmaps r
      WHERE r.id = tasks.roadmap_id AND r.user_id = auth.uid()
    )
  );

-- --- RESOURCES (public, ai cũng đọc được) ---
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_select_all" ON public.resources;
CREATE POLICY "resources_select_all"
  ON public.resources FOR SELECT
  USING (true);

-- ============================================================
-- 6. AUTO-CREATE PROFILE TRIGGER
-- Tự động tạo profile khi user đăng ký qua Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Xóa trigger cũ nếu có
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. AUTO-UPDATE updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS roadmaps_updated_at ON public.roadmaps;
CREATE TRIGGER roadmaps_updated_at
  BEFORE UPDATE ON public.roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 8. DỮ LIỆU MẪU — Resources
-- ============================================================
INSERT INTO public.resources (tag, title, url, type) VALUES
  -- IELTS
  ('ielts-listening', 'IELTS Listening Practice - British Council',   'https://www.youtube.com/watch?v=KGpVDXw1d5U', 'video'),
  ('ielts-listening', 'IELTS Listening Full Test with Answers',        'https://www.youtube.com/watch?v=3mBT9IQSD3s', 'video'),
  ('ielts-reading',   'IELTS Reading Tips & Strategies',              'https://www.youtube.com/watch?v=V_6Y-_AZEEI', 'video'),
  ('ielts-writing',   'IELTS Writing Task 1 - Line Graph',            'https://www.youtube.com/watch?v=K_jVZPV4jqM', 'video'),
  ('ielts-writing',   'IELTS Writing Task 2 - How to Structure',      'https://www.youtube.com/watch?v=CJqVEOkFO7Y', 'video'),
  ('ielts-speaking',  'IELTS Speaking Band 9 Sample',                 'https://www.youtube.com/watch?v=q9DPTBvWzKs', 'video'),
  ('ielts-vocab',     'IELTS Vocabulary - Academic Word List',        'https://www.youtube.com/watch?v=6BcDIiAlNRM', 'video'),
  ('ielts-grammar',   'IELTS Grammar - Common Mistakes',              'https://www.youtube.com/watch?v=FJuQXW0_Nv0', 'video'),
  -- Lập trình
  ('html-css',        'HTML & CSS Full Course - freeCodeCamp',        'https://www.youtube.com/watch?v=mU6anWqZJcc', 'video'),
  ('html-css',        'Tailwind CSS Tutorial - Traversy Media',        'https://www.youtube.com/watch?v=UBOj6rqRUME', 'video'),
  ('javascript',      'JavaScript Full Course - freeCodeCamp',        'https://www.youtube.com/watch?v=PkZNo7MFNFg', 'video'),
  ('javascript',      'JavaScript ES6+ Modern Features',              'https://www.youtube.com/watch?v=NCwa_xi0Uuc', 'video'),
  ('react',           'React Tutorial for Beginners',                 'https://www.youtube.com/watch?v=SqcY0GlETPk', 'video'),
  ('react',           'React Hooks - useState, useEffect',            'https://www.youtube.com/watch?v=O6P86uwfdR0', 'video'),
  ('nodejs',          'Node.js & Express Full Course',                'https://www.youtube.com/watch?v=Oe421EPjeBE', 'video'),
  ('nodejs',          'REST API with Node.js & Express',              'https://www.youtube.com/watch?v=l8WPWK9mS5M', 'video'),
  ('python',          'Python Tutorial for Beginners',                'https://www.youtube.com/watch?v=_uQrJ0TkZlc', 'video'),
  ('git',             'Git and GitHub for Beginners',                 'https://www.youtube.com/watch?v=RGOj5yH7evk', 'video'),
  ('sql',             'SQL Tutorial - Full Database Course',          'https://www.youtube.com/watch?v=HXV3zeQKqGY', 'video'),
  ('algorithm',       'Data Structures & Algorithms - freeCodeCamp', 'https://www.youtube.com/watch?v=8hly31xKli0', 'video'),
  -- Thiết kế
  ('design-basic',    'Design Principles - The Basics',              'https://www.youtube.com/watch?v=YqQx75OPRa0', 'video'),
  ('ui-ux',           'UI/UX Design Tutorial for Beginners',         'https://www.youtube.com/watch?v=c9Wg6Cb_YlU', 'video'),
  ('figma',           'Figma Tutorial for Beginners 2024',           'https://www.youtube.com/watch?v=FTFaQWZBqQ8', 'video'),
  ('figma',           'Figma Auto Layout - Complete Guide',          'https://www.youtube.com/watch?v=TyaGpGDFczw', 'video'),
  ('design-system',   'Design Systems in Figma',                     'https://www.youtube.com/watch?v=EK-pHkc5EL4', 'video')
ON CONFLICT DO NOTHING;

-- ============================================================
-- KIỂM TRA: Chạy query này để xác nhận bảng đã tạo xong
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
