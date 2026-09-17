PRAGMA foreign_keys = ON;

-- V0.6 tenant boundary. Existing V0.5 data is preserved and becomes global/shared.
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  tenant_type TEXT NOT NULL DEFAULT 'school' CHECK(tenant_type IN ('platform','school','tuition_centre','family','coach','other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','archived')),
  plan TEXT NOT NULL DEFAULT 'standard',
  ai_request_quota_monthly INTEGER DEFAULT 5000 CHECK(ai_request_quota_monthly IS NULL OR ai_request_quota_monthly >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO tenants (id,slug,name,tenant_type,status,plan,ai_request_quota_monthly)
VALUES ('tenant-default','default','English Mastery Default','platform','active','platform',NULL);

CREATE TABLE IF NOT EXISTS tenant_members (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('admin','teacher','parent','student')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id,status,tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_role ON tenant_members(tenant_id,role,status);

CREATE TABLE IF NOT EXISTS staff_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('admin','teacher')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON staff_sessions(token_hash,expires_at);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_tenant ON staff_sessions(tenant_id,user_id,expires_at);

CREATE TABLE IF NOT EXISTS tenant_integrations (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_type TEXT NOT NULL CHECK(setting_type IN ('text','secret')),
  value_text TEXT,
  value_ciphertext TEXT,
  iv TEXT,
  display_hint TEXT,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id,setting_key)
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  school_level TEXT NOT NULL CHECK(school_level IN ('P5','P6')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_courses_tenant ON courses(tenant_id,status,updated_at);

CREATE TABLE IF NOT EXISTS course_items (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK(item_type IN ('content','question','practice_set','assessment')),
  resource_id TEXT NOT NULL,
  resource_version INTEGER,
  item_order INTEGER NOT NULL DEFAULT 1,
  title_override TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id,item_order)
);
CREATE INDEX IF NOT EXISTS idx_course_items_resource ON course_items(item_type,resource_id);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  available_from TEXT,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','closed','archived')),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assignments_tenant ON assignments(tenant_id,status,due_at);

CREATE TABLE IF NOT EXISTS assignment_targets (
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','in_progress','completed','excused')),
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY (assignment_id,child_id)
);
CREATE INDEX IF NOT EXISTS idx_assignment_targets_child ON assignment_targets(child_id,status,assignment_id);

CREATE TABLE IF NOT EXISTS tenant_ai_usage (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  child_id TEXT REFERENCES child_profiles(id) ON DELETE SET NULL,
  generation_job_id TEXT REFERENCES generation_jobs(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL,
  model TEXT,
  request_count INTEGER NOT NULL DEFAULT 1,
  input_tokens INTEGER,
  output_tokens INTEGER,
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK(status IN ('succeeded','failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant_date ON tenant_ai_usage(tenant_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_usage_job ON tenant_ai_usage(generation_job_id) WHERE generation_job_id IS NOT NULL;

-- Every existing family is assigned to the default tenant. Future creation paths set this explicitly.
ALTER TABLE child_profiles ADD COLUMN tenant_id TEXT REFERENCES tenants(id);
UPDATE child_profiles SET tenant_id='tenant-default' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_child_profiles_tenant ON child_profiles(tenant_id,parent_user_id);

INSERT OR IGNORE INTO tenant_members (tenant_id,user_id,role,status)
SELECT 'tenant-default',id,
  CASE role WHEN 'teacher' THEN 'teacher' WHEN 'admin' THEN 'admin' WHEN 'student' THEN 'student' ELSE 'parent' END,
  'active'
FROM users;

-- Shared platform resources are global by default. Tenant-created resources carry scope='tenant'.
ALTER TABLE content_items ADD COLUMN tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE content_items ADD COLUMN scope TEXT NOT NULL DEFAULT 'global' CHECK(scope IN ('global','tenant'));
CREATE INDEX IF NOT EXISTS idx_content_scope_tenant ON content_items(scope,tenant_id,status);

ALTER TABLE questions ADD COLUMN tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE questions ADD COLUMN scope TEXT NOT NULL DEFAULT 'global' CHECK(scope IN ('global','tenant'));
CREATE INDEX IF NOT EXISTS idx_questions_scope_tenant ON questions(scope,tenant_id,status);

ALTER TABLE assessments ADD COLUMN tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE assessments ADD COLUMN scope TEXT NOT NULL DEFAULT 'global' CHECK(scope IN ('global','tenant'));
CREATE INDEX IF NOT EXISTS idx_assessments_scope_tenant ON assessments(scope,tenant_id,status);

ALTER TABLE practice_sets ADD COLUMN tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE practice_sets ADD COLUMN scope TEXT NOT NULL DEFAULT 'global' CHECK(scope IN ('global','tenant'));
CREATE INDEX IF NOT EXISTS idx_practice_scope_tenant ON practice_sets(scope,tenant_id,status);

ALTER TABLE generation_jobs ADD COLUMN tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE generation_jobs ADD COLUMN scope TEXT NOT NULL DEFAULT 'global' CHECK(scope IN ('global','tenant'));
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status ON generation_jobs(tenant_id,status,created_at);

ALTER TABLE question_generation_batches ADD COLUMN tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE question_generation_batches ADD COLUMN scope TEXT NOT NULL DEFAULT 'global' CHECK(scope IN ('global','tenant'));
CREATE INDEX IF NOT EXISTS idx_qgen_tenant ON question_generation_batches(tenant_id,status,created_at);

ALTER TABLE ai_runs ADD COLUMN tenant_id TEXT REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_tenant ON ai_runs(tenant_id,created_at);
