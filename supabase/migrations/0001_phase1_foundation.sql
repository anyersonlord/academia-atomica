-- ============================================================================
-- Academia Atómica: Grupos Electrógenos
-- Migración 0001: Cimiento Relacional, Integridad DAG y Seguridad Zero-Trust
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Función utilitaria de timestamp (search_path fijado por seguridad)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 0. Registro interno de migraciones (sin acceso público ni autenticado)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.schema_migrations FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1. Capas ontológicas L0–L11 (Mapa estructural exclusivo Grupos Electrógenos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^L([0-9]|1[0-1])$'),
  order_index smallint NOT NULL UNIQUE CHECK (order_index BETWEEN 0 AND 11),
  title text NOT NULL,
  subtitle text NOT NULL,
  physical_scope text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('active', 'planned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_layers_updated_at ON public.layers;
CREATE TRIGGER trg_layers_updated_at
  BEFORE UPDATE ON public.layers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Átomos conceptuales reales (Protocolo N-6 en content_json validado con Zod)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.concept_atoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id uuid NOT NULL REFERENCES public.layers(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE CHECK (code ~ '^L([0-9]|1[0-1])\.[1-9][0-9]*$'),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text NOT NULL,
  order_index smallint NOT NULL CHECK (order_index >= 1),
  status text NOT NULL DEFAULT 'calibration' CHECK (status IN ('calibration', 'draft', 'published')),
  primary_quantity text NULL CHECK (
    primary_quantity IS NULL OR
    primary_quantity IN ('electric', 'magnetic', 'thermal', 'mechanical', 'signal')
  ),
  simulator_key text NULL,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version smallint NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (layer_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_concept_atoms_layer_order
  ON public.concept_atoms(layer_id, order_index);

DROP TRIGGER IF EXISTS trg_concept_atoms_updated_at ON public.concept_atoms;
CREATE TRIGGER trg_concept_atoms_updated_at
  BEFORE UPDATE ON public.concept_atoms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Aristas del Grafo Acíclico Dirigido (DAG) + Trigger anti-ciclos en DB
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atom_prerequisites (
  atom_id uuid NOT NULL REFERENCES public.concept_atoms(id) ON DELETE CASCADE,
  prerequisite_atom_id uuid NOT NULL REFERENCES public.concept_atoms(id) ON DELETE CASCADE,
  strength text NOT NULL DEFAULT 'required' CHECK (strength IN ('required', 'recommended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (atom_id, prerequisite_atom_id),
  CHECK (atom_id <> prerequisite_atom_id)
);

CREATE INDEX IF NOT EXISTS idx_atom_prerequisites_prereq
  ON public.atom_prerequisites(prerequisite_atom_id);

CREATE OR REPLACE FUNCTION public.prevent_atom_dag_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  has_cycle boolean;
BEGIN
  IF NEW.atom_id = NEW.prerequisite_atom_id THEN
    RAISE EXCEPTION 'DAG cycle detected: atom % cannot depend on itself', NEW.atom_id
      USING ERRCODE = 'check_violation';
  END IF;

  WITH RECURSIVE ancestor_chain AS (
    SELECT NEW.prerequisite_atom_id AS node_id
    UNION
    SELECT ap.prerequisite_atom_id
    FROM public.atom_prerequisites ap
    INNER JOIN ancestor_chain ac ON ap.atom_id = ac.node_id
    WHERE NOT (
      TG_OP = 'UPDATE'
      AND ap.atom_id = OLD.atom_id
      AND ap.prerequisite_atom_id = OLD.prerequisite_atom_id
    )
  )
  SELECT EXISTS (
    SELECT 1 FROM ancestor_chain WHERE node_id = NEW.atom_id
  ) INTO has_cycle;

  IF has_cycle THEN
    RAISE EXCEPTION 'DAG cycle detected: prerequisite % introduces circular dependency for atom %',
      NEW.prerequisite_atom_id, NEW.atom_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_atom_dag_cycle ON public.atom_prerequisites;
CREATE TRIGGER trg_prevent_atom_dag_cycle
  BEFORE INSERT OR UPDATE ON public.atom_prerequisites
  FOR EACH ROW EXECUTE FUNCTION public.prevent_atom_dag_cycle();

-- ----------------------------------------------------------------------------
-- 4. Glosario Vivo Atómico
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  term text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  mental_image_short text NOT NULL,
  technical_definition text NOT NULL,
  origin_atom_id uuid NULL REFERENCES public.concept_atoms(id) ON DELETE SET NULL,
  physical_quantity text NULL CHECK (
    physical_quantity IS NULL OR
    physical_quantity IN ('electric', 'magnetic', 'thermal', 'mechanical', 'signal')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_glossary_terms_origin
  ON public.glossary_terms(origin_atom_id);

DROP TRIGGER IF EXISTS trg_glossary_terms_updated_at ON public.glossary_terms;
CREATE TRIGGER trg_glossary_terms_updated_at
  BEFORE UPDATE ON public.glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Progreso cognitivo por usuario (Higiene user_id + columnas futuras FSRS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_atom_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  atom_id uuid NOT NULL REFERENCES public.concept_atoms(id) ON DELETE CASCADE,
  current_stage smallint NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 6),
  completed_stages smallint[] NOT NULL DEFAULT '{}',
  mastery_status text NOT NULL DEFAULT 'ready' CHECK (
    mastery_status IN ('locked', 'ready', 'in_progress', 'assimilated')
  ),
  mental_image_note text NOT NULL DEFAULT '',
  prediction_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_reviewed_at timestamptz NULL,
  next_review_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, atom_id)
);

CREATE INDEX IF NOT EXISTS idx_user_atom_progress_user
  ON public.user_atom_progress(user_id);

DROP TRIGGER IF EXISTS trg_user_atom_progress_updated_at ON public.user_atom_progress;
CREATE TRIGGER trg_user_atom_progress_updated_at
  BEFORE UPDATE ON public.user_atom_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Preferencias ergonómicas por usuario (Dark Lab / Light Editorial / Zen)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_workspace_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark-lab' CHECK (theme IN ('dark-lab', 'light-editorial')),
  zen_mode_default boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_user_workspace_preferences_updated_at ON public.user_workspace_preferences;
CREATE TRIGGER trg_user_workspace_preferences_updated_at
  BEFORE UPDATE ON public.user_workspace_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Seguridad Zero-Trust: Privilegios explícitos + RLS obligatorio en TODAS
-- ----------------------------------------------------------------------------
REVOKE ALL ON TABLE
  public.layers,
  public.concept_atoms,
  public.atom_prerequisites,
  public.glossary_terms,
  public.user_atom_progress,
  public.user_workspace_preferences
FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT ALL ON TABLE
  public.layers,
  public.concept_atoms,
  public.atom_prerequisites,
  public.glossary_terms,
  public.user_atom_progress,
  public.user_workspace_preferences
TO service_role;

GRANT SELECT ON TABLE
  public.layers,
  public.concept_atoms,
  public.atom_prerequisites,
  public.glossary_terms
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.user_atom_progress,
  public.user_workspace_preferences
TO authenticated;

ALTER TABLE public.layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_atoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atom_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_atom_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workspace_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura curricular (solo usuarios autenticados)
DROP POLICY IF EXISTS "layers_select_authenticated" ON public.layers;
CREATE POLICY "layers_select_authenticated"
  ON public.layers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "concept_atoms_select_authenticated" ON public.concept_atoms;
CREATE POLICY "concept_atoms_select_authenticated"
  ON public.concept_atoms FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "atom_prerequisites_select_authenticated" ON public.atom_prerequisites;
CREATE POLICY "atom_prerequisites_select_authenticated"
  ON public.atom_prerequisites FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "glossary_terms_select_authenticated" ON public.glossary_terms;
CREATE POLICY "glossary_terms_select_authenticated"
  ON public.glossary_terms FOR SELECT
  TO authenticated
  USING (true);

-- Políticas personales estrictas (auth.uid() = user_id)
DROP POLICY IF EXISTS "user_atom_progress_select_own" ON public.user_atom_progress;
CREATE POLICY "user_atom_progress_select_own"
  ON public.user_atom_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_atom_progress_insert_own" ON public.user_atom_progress;
CREATE POLICY "user_atom_progress_insert_own"
  ON public.user_atom_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_atom_progress_update_own" ON public.user_atom_progress;
CREATE POLICY "user_atom_progress_update_own"
  ON public.user_atom_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_atom_progress_delete_own" ON public.user_atom_progress;
CREATE POLICY "user_atom_progress_delete_own"
  ON public.user_atom_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_workspace_preferences_select_own" ON public.user_workspace_preferences;
CREATE POLICY "user_workspace_preferences_select_own"
  ON public.user_workspace_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_workspace_preferences_insert_own" ON public.user_workspace_preferences;
CREATE POLICY "user_workspace_preferences_insert_own"
  ON public.user_workspace_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_workspace_preferences_update_own" ON public.user_workspace_preferences;
CREATE POLICY "user_workspace_preferences_update_own"
  ON public.user_workspace_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_workspace_preferences_delete_own" ON public.user_workspace_preferences;
CREATE POLICY "user_workspace_preferences_delete_own"
  ON public.user_workspace_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
