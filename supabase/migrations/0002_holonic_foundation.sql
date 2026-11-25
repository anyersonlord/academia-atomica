-- ============================================================================
-- Academia Atómica: Grupos Electrógenos
-- Migración 0002: Chasis Universal Holónico, Grafos M:N/Semántico, Revisiones
-- Inmutables y Notas Personales Versionadas de Solo Adición
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Limpieza idempotente de artefactos planos obsoletos de 0001
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_prevent_atom_dag_cycle ON public.atom_prerequisites;
DROP FUNCTION IF EXISTS public.prevent_atom_dag_cycle();
DROP TABLE IF EXISTS public.atom_prerequisites;
DROP TABLE IF EXISTS public.user_atom_progress;

-- ----------------------------------------------------------------------------
-- 2. Evolución de concept_atoms -> concept_nodes (entidad conceptual universal)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.concept_atoms') IS NOT NULL
     AND to_regclass('public.concept_nodes') IS NULL THEN
    ALTER TABLE public.concept_atoms RENAME TO concept_nodes;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'concept_nodes'
      AND column_name = 'layer_id'
  ) THEN
    ALTER TABLE public.concept_nodes RENAME COLUMN layer_id TO home_layer_id;
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.idx_concept_atoms_layer_order;
ALTER TABLE public.concept_nodes
  DROP CONSTRAINT IF EXISTS concept_atoms_layer_id_order_index_key;

ALTER TABLE public.concept_nodes
  DROP COLUMN IF EXISTS order_index;

-- Ampliar code para admitir raíces de capa (L0..L11) y códigos holónicos (L0.1, L4.2.1...)
ALTER TABLE public.concept_nodes
  DROP CONSTRAINT IF EXISTS concept_atoms_code_check,
  DROP CONSTRAINT IF EXISTS concept_nodes_code_check;
ALTER TABLE public.concept_nodes
  ADD CONSTRAINT concept_nodes_code_check
  CHECK (code ~ '^L([0-9]|1[0-1])(\.[1-9][0-9]*)*$');

-- Restringir slug estrictamente a kebab-case alfanumérico sin puntos (para ?via=a.b)
ALTER TABLE public.concept_nodes
  DROP CONSTRAINT IF EXISTS concept_atoms_slug_check,
  DROP CONSTRAINT IF EXISTS concept_nodes_slug_check;
ALTER TABLE public.concept_nodes
  ADD CONSTRAINT concept_nodes_slug_check
  CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

-- Permitir estado 'archived' (nunca borrado en cascada de nodos con historia)
ALTER TABLE public.concept_nodes
  DROP CONSTRAINT IF EXISTS concept_atoms_status_check,
  DROP CONSTRAINT IF EXISTS concept_nodes_status_check;
ALTER TABLE public.concept_nodes
  ADD CONSTRAINT concept_nodes_status_check
  CHECK (status IN ('calibration', 'draft', 'published', 'archived'));

ALTER TABLE public.concept_nodes
  ADD COLUMN IF NOT EXISTS is_layer_root boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forbidden_terms text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content_revision integer NOT NULL DEFAULT 1;

ALTER TABLE public.concept_nodes
  ALTER COLUMN schema_version SET DEFAULT 2;

ALTER TABLE public.concept_nodes
  DROP CONSTRAINT IF EXISTS concept_nodes_content_revision_check;
ALTER TABLE public.concept_nodes
  ADD CONSTRAINT concept_nodes_content_revision_check
  CHECK (content_revision >= 1);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_concept_nodes_layer_root
  ON public.concept_nodes(home_layer_id)
  WHERE is_layer_root = true;

CREATE INDEX IF NOT EXISTS idx_concept_nodes_home_layer
  ON public.concept_nodes(home_layer_id);

DROP TRIGGER IF EXISTS trg_concept_atoms_updated_at ON public.concept_nodes;
DROP TRIGGER IF EXISTS trg_concept_nodes_updated_at ON public.concept_nodes;
CREATE TRIGGER trg_concept_nodes_updated_at
  BEFORE UPDATE ON public.concept_nodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Conexión Capa <-> Holón en public.layers (root_node_id)
-- ----------------------------------------------------------------------------
ALTER TABLE public.layers
  ADD COLUMN IF NOT EXISTS root_node_id uuid NULL UNIQUE
  REFERENCES public.concept_nodes(id) ON DELETE RESTRICT;

-- ----------------------------------------------------------------------------
-- 4. Ajuste de FK en public.glossary_terms (origin_atom_id -> origin_node_id)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'glossary_terms'
      AND column_name = 'origin_atom_id'
  ) THEN
    ALTER TABLE public.glossary_terms RENAME COLUMN origin_atom_id TO origin_node_id;
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.idx_glossary_terms_origin;
CREATE INDEX IF NOT EXISTS idx_glossary_terms_origin_node
  ON public.glossary_terms(origin_node_id);

-- ----------------------------------------------------------------------------
-- 5. Trigger de identidad inmutable (id, slug; code permanece editable)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_entity_identity_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Identity mutation forbidden: id (%) is immutable on %.%',
      OLD.id, TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'Identity mutation forbidden: slug (%) is immutable on %.%',
      OLD.slug, TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_TABLE_NAME = 'concept_nodes' AND NEW.content_revision < OLD.content_revision THEN
    RAISE EXCEPTION 'Revision regression forbidden: content_revision (%) cannot be less than %',
      NEW.content_revision, OLD.content_revision
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_concept_nodes_identity_immutable ON public.concept_nodes;
CREATE TRIGGER trg_concept_nodes_identity_immutable
  BEFORE UPDATE ON public.concept_nodes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_entity_identity_mutation();

DROP TRIGGER IF EXISTS trg_glossary_terms_identity_immutable ON public.glossary_terms;
CREATE TRIGGER trg_glossary_terms_identity_immutable
  BEFORE UPDATE ON public.glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.prevent_entity_identity_mutation();

-- ----------------------------------------------------------------------------
-- 6. Composición holónica muchos-a-muchos (node_compositions) + anti-ciclos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.node_compositions (
  parent_id uuid NOT NULL REFERENCES public.concept_nodes(id) ON DELETE RESTRICT,
  child_id uuid NOT NULL REFERENCES public.concept_nodes(id) ON DELETE RESTRICT,
  role_in_parent text NOT NULL,
  integration_note text NOT NULL DEFAULT '',
  group_label text NULL,
  structural_order smallint NOT NULL CHECK (structural_order >= 1),
  discovery_order smallint NOT NULL CHECK (discovery_order >= 1),
  added_in_parent_revision integer NOT NULL DEFAULT 1 CHECK (added_in_parent_revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, child_id),
  CHECK (parent_id <> child_id),
  CONSTRAINT uniq_node_compositions_structural_order
    UNIQUE (parent_id, structural_order) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT uniq_node_compositions_discovery_order
    UNIQUE (parent_id, discovery_order) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS idx_node_compositions_child
  ON public.node_compositions(child_id);

DROP TRIGGER IF EXISTS trg_node_compositions_updated_at ON public.node_compositions;
CREATE TRIGGER trg_node_compositions_updated_at
  BEFORE UPDATE ON public.node_compositions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_composition_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  has_cycle boolean;
BEGIN
  IF NEW.parent_id = NEW.child_id THEN
    RAISE EXCEPTION 'Composition cycle detected: node % cannot contain itself', NEW.parent_id
      USING ERRCODE = 'check_violation';
  END IF;

  WITH RECURSIVE descendant_chain AS (
    SELECT NEW.child_id AS node_id
    UNION
    SELECT nc.child_id
    FROM public.node_compositions nc
    INNER JOIN descendant_chain dc ON nc.parent_id = dc.node_id
    WHERE NOT (
      TG_OP = 'UPDATE'
      AND nc.parent_id = OLD.parent_id
      AND nc.child_id = OLD.child_id
    )
  )
  SELECT EXISTS (
    SELECT 1 FROM descendant_chain WHERE node_id = NEW.parent_id
  ) INTO has_cycle;

  IF has_cycle THEN
    RAISE EXCEPTION 'Composition cycle detected: linking child % into parent % creates a cycle',
      NEW.child_id, NEW.parent_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_composition_cycle ON public.node_compositions;
CREATE TRIGGER trg_prevent_composition_cycle
  BEFORE INSERT OR UPDATE ON public.node_compositions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_composition_cycle();

-- ----------------------------------------------------------------------------
-- 7. Grafo semántico tipado (node_relations) + anti-ciclos en prerequisite
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.node_relations (
  from_id uuid NOT NULL REFERENCES public.concept_nodes(id) ON DELETE RESTRICT,
  to_id uuid NOT NULL REFERENCES public.concept_nodes(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('prerequisite', 'contrast', 'recall_bridge')),
  strength text NULL CHECK (
    (kind = 'prerequisite' AND strength IN ('required', 'recommended'))
    OR (kind <> 'prerequisite' AND strength IS NULL)
  ),
  context_note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_id, to_id, kind),
  CHECK (from_id <> to_id)
);

CREATE INDEX IF NOT EXISTS idx_node_relations_to_kind
  ON public.node_relations(to_id, kind);

CREATE OR REPLACE FUNCTION public.prevent_prerequisite_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  has_cycle boolean;
BEGIN
  IF NEW.kind <> 'prerequisite' THEN
    RETURN NEW;
  END IF;

  IF NEW.from_id = NEW.to_id THEN
    RAISE EXCEPTION 'Prerequisite DAG cycle detected: node % cannot depend on itself', NEW.from_id
      USING ERRCODE = 'check_violation';
  END IF;

  WITH RECURSIVE prereq_chain AS (
    SELECT NEW.to_id AS node_id
    UNION
    SELECT nr.to_id
    FROM public.node_relations nr
    INNER JOIN prereq_chain pc ON nr.from_id = pc.node_id
    WHERE nr.kind = 'prerequisite'
      AND NOT (
        TG_OP = 'UPDATE'
        AND nr.from_id = OLD.from_id
        AND nr.to_id = OLD.to_id
        AND nr.kind = OLD.kind
      )
  )
  SELECT EXISTS (
    SELECT 1 FROM prereq_chain WHERE node_id = NEW.from_id
  ) INTO has_cycle;

  IF has_cycle THEN
    RAISE EXCEPTION 'Prerequisite DAG cycle detected: adding prerequisite % to node % creates a cycle',
      NEW.to_id, NEW.from_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_prerequisite_cycle ON public.node_relations;
CREATE TRIGGER trg_prevent_prerequisite_cycle
  BEFORE INSERT OR UPDATE ON public.node_relations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_prerequisite_cycle();

-- ----------------------------------------------------------------------------
-- 8. Historial inmutable de revisiones por nodo completo (node_revisions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.node_revisions (
  node_id uuid NOT NULL REFERENCES public.concept_nodes(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision >= 1),
  content_json jsonb NOT NULL,
  forbidden_terms text[] NOT NULL DEFAULT '{}',
  schema_version smallint NOT NULL CHECK (schema_version >= 1),
  change_summary text NOT NULL DEFAULT '',
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, revision)
);

CREATE OR REPLACE FUNCTION public.prevent_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'node_revisions is strictly append-only (% forbidden on node % rev %)',
    TG_OP, OLD.node_id, OLD.revision
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_revision_mutation ON public.node_revisions;
CREATE TRIGGER trg_prevent_revision_mutation
  BEFORE UPDATE OR DELETE ON public.node_revisions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_revision_mutation();

-- ----------------------------------------------------------------------------
-- 9. Progreso holónico por usuario (user_node_progress)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_node_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.concept_nodes(id) ON DELETE RESTRICT,
  holonic_phase text NOT NULL DEFAULT 'n6' CHECK (
    holonic_phase IN ('n6', 'preview', 'parts', 'synthesis')
  ),
  current_stage smallint NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 6),
  current_scene_id text NULL CHECK (
    current_scene_id IS NULL OR current_scene_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  completed_stages smallint[] NOT NULL DEFAULT '{}',
  completed_scene_ids text[] NOT NULL DEFAULT '{}',
  mastery_status text NOT NULL DEFAULT 'ready' CHECK (
    mastery_status IN ('locked', 'ready', 'in_progress', 'assimilated', 'evolved')
  ),
  assimilated_revision integer NULL CHECK (
    assimilated_revision IS NULL OR assimilated_revision >= 1
  ),
  prediction_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_reviewed_at timestamptz NULL,
  next_review_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_user_node_progress_user
  ON public.user_node_progress(user_id);

DROP TRIGGER IF EXISTS trg_user_node_progress_updated_at ON public.user_node_progress;
CREATE TRIGGER trg_user_node_progress_updated_at
  BEFORE UPDATE ON public.user_node_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. Notas propias versionadas e intocables (user_node_notes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_node_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.concept_nodes(id) ON DELETE RESTRICT,
  note_kind text NOT NULL CHECK (note_kind IN ('mental_image', 'living_synthesis')),
  stage_number smallint NULL CHECK (
    (note_kind = 'mental_image' AND stage_number = 4)
    OR (note_kind = 'living_synthesis' AND stage_number IS NULL)
  ),
  scene_id text NOT NULL CHECK (scene_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  node_revision integer NOT NULL CHECK (node_revision >= 1),
  body text NOT NULL CHECK (char_length(btrim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, node_id, note_kind, scene_id, node_revision)
);

CREATE INDEX IF NOT EXISTS idx_user_node_notes_user_node
  ON public.user_node_notes(user_id, node_id);

CREATE OR REPLACE FUNCTION public.enforce_user_node_note_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  active_node_revision integer;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.node_id IS DISTINCT FROM OLD.node_id
     OR NEW.note_kind IS DISTINCT FROM OLD.note_kind
     OR NEW.stage_number IS DISTINCT FROM OLD.stage_number
     OR NEW.scene_id IS DISTINCT FROM OLD.scene_id
     OR NEW.node_revision IS DISTINCT FROM OLD.node_revision
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Immutable anchor column modified on user_node_notes'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  SELECT cn.content_revision INTO active_node_revision
  FROM public.concept_nodes cn
  WHERE cn.id = OLD.node_id;

  IF active_node_revision IS NULL OR OLD.node_revision <> active_node_revision THEN
    RAISE EXCEPTION 'Historical note (revision %) is strictly read-only; active node revision is %',
      OLD.node_revision, active_node_revision
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_node_notes_immutability ON public.user_node_notes;
CREATE TRIGGER trg_user_node_notes_immutability
  BEFORE UPDATE ON public.user_node_notes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_node_note_immutability();

-- ----------------------------------------------------------------------------
-- 11. Seguridad Zero-Trust: Privilegios explícitos + RLS obligatorio
-- ----------------------------------------------------------------------------
REVOKE ALL ON TABLE
  public.layers,
  public.concept_nodes,
  public.node_compositions,
  public.node_relations,
  public.node_revisions,
  public.glossary_terms,
  public.user_node_progress,
  public.user_node_notes,
  public.user_workspace_preferences
FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT ALL ON TABLE
  public.layers,
  public.concept_nodes,
  public.node_compositions,
  public.node_relations,
  public.node_revisions,
  public.glossary_terms,
  public.user_node_progress,
  public.user_node_notes,
  public.user_workspace_preferences
TO service_role;

GRANT SELECT ON TABLE
  public.layers,
  public.concept_nodes,
  public.node_compositions,
  public.node_relations,
  public.node_revisions,
  public.glossary_terms
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.user_node_progress,
  public.user_workspace_preferences
TO authenticated;

-- DELETE explícitamente revocado de authenticated sobre user_node_notes
REVOKE ALL ON TABLE public.user_node_notes FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_node_notes TO authenticated;

ALTER TABLE public.layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_node_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_node_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workspace_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura curricular (authenticated)
DROP POLICY IF EXISTS "concept_atoms_select_authenticated" ON public.concept_nodes;
DROP POLICY IF EXISTS "concept_nodes_select_authenticated" ON public.concept_nodes;
CREATE POLICY "concept_nodes_select_authenticated"
  ON public.concept_nodes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "node_compositions_select_authenticated" ON public.node_compositions;
CREATE POLICY "node_compositions_select_authenticated"
  ON public.node_compositions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "node_relations_select_authenticated" ON public.node_relations;
CREATE POLICY "node_relations_select_authenticated"
  ON public.node_relations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "node_revisions_select_authenticated" ON public.node_revisions;
CREATE POLICY "node_revisions_select_authenticated"
  ON public.node_revisions FOR SELECT
  TO authenticated
  USING (true);

-- Políticas personales user_node_progress
DROP POLICY IF EXISTS "user_node_progress_select_own" ON public.user_node_progress;
CREATE POLICY "user_node_progress_select_own"
  ON public.user_node_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_node_progress_insert_own" ON public.user_node_progress;
CREATE POLICY "user_node_progress_insert_own"
  ON public.user_node_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_node_progress_update_own" ON public.user_node_progress;
CREATE POLICY "user_node_progress_update_own"
  ON public.user_node_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_node_progress_delete_own" ON public.user_node_progress;
CREATE POLICY "user_node_progress_delete_own"
  ON public.user_node_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas personales user_node_notes (SIN política DELETE: notas indestructibles)
DROP POLICY IF EXISTS "user_node_notes_select_own" ON public.user_node_notes;
CREATE POLICY "user_node_notes_select_own"
  ON public.user_node_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_node_notes_insert_own" ON public.user_node_notes;
CREATE POLICY "user_node_notes_insert_own"
  ON public.user_node_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_node_notes_update_own" ON public.user_node_notes;
CREATE POLICY "user_node_notes_update_own"
  ON public.user_node_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
