
-- Datasets table: stores uploaded dataset metadata
CREATE TABLE datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  original_filename text NOT NULL,
  file_format text NOT NULL CHECK (file_format IN ('csv', 'xlsx', 'json', 'txt')),
  row_count integer NOT NULL DEFAULT 0,
  column_count integer NOT NULL DEFAULT 0,
  schema_info jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'analyzing', 'ready', 'cleaning', 'cleaned', 'exported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Dataset data: stores the actual cell data
CREATE TABLE dataset_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  row_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dataset_rows_dataset_id ON dataset_rows(dataset_id);
CREATE INDEX idx_dataset_rows_row_index ON dataset_rows(dataset_id, row_index);

-- Data errors: detected errors in dataset
CREATE TABLE dataset_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  row_index integer,
  column_name text,
  error_type text NOT NULL,
  error_description text NOT NULL,
  suggested_fix text,
  is_fixed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dataset_errors_dataset_id ON dataset_errors(dataset_id);

-- Cleaning history / transformation logs
CREATE TABLE cleaning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  operation_mode text NOT NULL DEFAULT 'manual' CHECK (operation_mode IN ('manual', 'basic', 'smart', 'ai')),
  description text NOT NULL,
  affected_rows integer NOT NULL DEFAULT 0,
  affected_columns text[] NOT NULL DEFAULT '{}',
  before_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cleaning_logs_dataset_id ON cleaning_logs(dataset_id);

-- Enable row-level security disabled (no auth for v1)
ALTER TABLE datasets DISABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_rows DISABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_errors DISABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_logs DISABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
