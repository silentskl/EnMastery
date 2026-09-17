PRAGMA foreign_keys = ON;

-- Hotfix 11.9: D1 rows-read optimisation.
-- Keep high-frequency reads proportional to the requested page/day range instead of
-- the tenant's full history. Backfills make this migration safe for existing data;
-- triggers keep each rollup correct for inserts, deletes and key-changing updates.

CREATE TABLE IF NOT EXISTS learning_task_day_rollups (
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  task_date TEXT NOT NULL,
  cadence TEXT NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 0,
  done_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(child_id,task_date,cadence)
);
INSERT OR REPLACE INTO learning_task_day_rollups(child_id,task_date,cadence,total_count,done_count,updated_at)
SELECT child_id,task_date,cadence,COUNT(*),SUM(CASE WHEN status='done' THEN 1 ELSE 0 END),CURRENT_TIMESTAMP
FROM learning_tasks GROUP BY child_id,task_date,cadence;
CREATE INDEX IF NOT EXISTS idx_learning_task_rollups_child_date
  ON learning_task_day_rollups(child_id,task_date,cadence,done_count,total_count);

CREATE TRIGGER IF NOT EXISTS trg_h119_learning_tasks_insert
AFTER INSERT ON learning_tasks BEGIN
  INSERT INTO learning_task_day_rollups(child_id,task_date,cadence,total_count,done_count,updated_at)
  VALUES(NEW.child_id,NEW.task_date,NEW.cadence,1,CASE WHEN NEW.status='done' THEN 1 ELSE 0 END,CURRENT_TIMESTAMP)
  ON CONFLICT(child_id,task_date,cadence) DO UPDATE SET
    total_count=total_count+1,
    done_count=done_count+CASE WHEN NEW.status='done' THEN 1 ELSE 0 END,
    updated_at=CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_learning_tasks_delete
AFTER DELETE ON learning_tasks BEGIN
  UPDATE learning_task_day_rollups SET
    total_count=MAX(0,total_count-1),
    done_count=MAX(0,done_count-CASE WHEN OLD.status='done' THEN 1 ELSE 0 END),
    updated_at=CURRENT_TIMESTAMP
  WHERE child_id=OLD.child_id AND task_date=OLD.task_date AND cadence=OLD.cadence;
  DELETE FROM learning_task_day_rollups
  WHERE child_id=OLD.child_id AND task_date=OLD.task_date AND cadence=OLD.cadence AND total_count=0;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_learning_tasks_update_status
AFTER UPDATE OF status ON learning_tasks
WHEN OLD.child_id=NEW.child_id AND OLD.task_date=NEW.task_date AND OLD.cadence=NEW.cadence BEGIN
  UPDATE learning_task_day_rollups SET
    done_count=MAX(0,done_count-CASE WHEN OLD.status='done' THEN 1 ELSE 0 END+CASE WHEN NEW.status='done' THEN 1 ELSE 0 END),
    updated_at=CURRENT_TIMESTAMP
  WHERE child_id=NEW.child_id AND task_date=NEW.task_date AND cadence=NEW.cadence;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_learning_tasks_update_key
AFTER UPDATE OF child_id,task_date,cadence ON learning_tasks
WHEN OLD.child_id<>NEW.child_id OR OLD.task_date<>NEW.task_date OR OLD.cadence<>NEW.cadence BEGIN
  UPDATE learning_task_day_rollups SET
    total_count=MAX(0,total_count-1),
    done_count=MAX(0,done_count-CASE WHEN OLD.status='done' THEN 1 ELSE 0 END),
    updated_at=CURRENT_TIMESTAMP
  WHERE child_id=OLD.child_id AND task_date=OLD.task_date AND cadence=OLD.cadence;
  DELETE FROM learning_task_day_rollups
  WHERE child_id=OLD.child_id AND task_date=OLD.task_date AND cadence=OLD.cadence AND total_count=0;
  INSERT INTO learning_task_day_rollups(child_id,task_date,cadence,total_count,done_count,updated_at)
  VALUES(NEW.child_id,NEW.task_date,NEW.cadence,1,CASE WHEN NEW.status='done' THEN 1 ELSE 0 END,CURRENT_TIMESTAMP)
  ON CONFLICT(child_id,task_date,cadence) DO UPDATE SET
    total_count=total_count+1,
    done_count=done_count+CASE WHEN NEW.status='done' THEN 1 ELSE 0 END,
    updated_at=CURRENT_TIMESTAMP;
END;

CREATE TABLE IF NOT EXISTS vocabulary_training_rollups (
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
  first_training_day TEXT NOT NULL,
  last_training_day TEXT NOT NULL,
  appearance_days INTEGER NOT NULL DEFAULT 1,
  event_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  last_trained_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(child_id,vocabulary_id)
);
INSERT OR REPLACE INTO vocabulary_training_rollups(child_id,vocabulary_id,first_training_day,last_training_day,appearance_days,event_count,correct_count,last_trained_at,updated_at)
SELECT child_id,vocabulary_id,MIN(date(created_at,'+8 hours')),MAX(date(created_at,'+8 hours')),
  COUNT(DISTINCT date(created_at,'+8 hours')),COUNT(*),SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END),MAX(created_at),CURRENT_TIMESTAMP
FROM vocabulary_training_events GROUP BY child_id,vocabulary_id;
CREATE INDEX IF NOT EXISTS idx_vocab_training_rollups_child_last_day
  ON vocabulary_training_rollups(child_id,last_training_day,vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_vocab_training_events_child_word_day
  ON vocabulary_training_events(child_id,vocabulary_id,created_at,correct);

CREATE TRIGGER IF NOT EXISTS trg_h119_vocab_events_insert
AFTER INSERT ON vocabulary_training_events BEGIN
  INSERT INTO vocabulary_training_rollups(child_id,vocabulary_id,first_training_day,last_training_day,appearance_days,event_count,correct_count,last_trained_at,updated_at)
  VALUES(NEW.child_id,NEW.vocabulary_id,date(NEW.created_at,'+8 hours'),date(NEW.created_at,'+8 hours'),1,1,CASE WHEN NEW.correct=1 THEN 1 ELSE 0 END,NEW.created_at,CURRENT_TIMESTAMP)
  ON CONFLICT(child_id,vocabulary_id) DO UPDATE SET
    first_training_day=MIN(first_training_day,excluded.first_training_day),last_training_day=MAX(last_training_day,excluded.last_training_day),
    appearance_days=appearance_days+CASE WHEN excluded.last_training_day>last_training_day OR excluded.first_training_day<first_training_day THEN 1 ELSE 0 END,
    event_count=event_count+1,correct_count=correct_count+excluded.correct_count,
    last_trained_at=MAX(last_trained_at,excluded.last_trained_at),updated_at=CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_vocab_events_delete
AFTER DELETE ON vocabulary_training_events BEGIN
  DELETE FROM vocabulary_training_rollups WHERE child_id=OLD.child_id AND vocabulary_id=OLD.vocabulary_id;
  INSERT INTO vocabulary_training_rollups(child_id,vocabulary_id,first_training_day,last_training_day,appearance_days,event_count,correct_count,last_trained_at,updated_at)
  SELECT OLD.child_id,OLD.vocabulary_id,MIN(date(created_at,'+8 hours')),MAX(date(created_at,'+8 hours')),
    COUNT(DISTINCT date(created_at,'+8 hours')),COUNT(*),SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END),MAX(created_at),CURRENT_TIMESTAMP
  FROM vocabulary_training_events WHERE child_id=OLD.child_id AND vocabulary_id=OLD.vocabulary_id
  HAVING COUNT(*)>0;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_vocab_events_update_value
AFTER UPDATE OF correct,created_at ON vocabulary_training_events
WHEN OLD.child_id=NEW.child_id AND OLD.vocabulary_id=NEW.vocabulary_id BEGIN
  DELETE FROM vocabulary_training_rollups WHERE child_id=NEW.child_id AND vocabulary_id=NEW.vocabulary_id;
  INSERT INTO vocabulary_training_rollups(child_id,vocabulary_id,first_training_day,last_training_day,appearance_days,event_count,correct_count,last_trained_at,updated_at)
  SELECT NEW.child_id,NEW.vocabulary_id,MIN(date(created_at,'+8 hours')),MAX(date(created_at,'+8 hours')),
    COUNT(DISTINCT date(created_at,'+8 hours')),COUNT(*),SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END),MAX(created_at),CURRENT_TIMESTAMP
  FROM vocabulary_training_events WHERE child_id=NEW.child_id AND vocabulary_id=NEW.vocabulary_id
  HAVING COUNT(*)>0;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_vocab_events_update_key
AFTER UPDATE OF child_id,vocabulary_id ON vocabulary_training_events
WHEN OLD.child_id<>NEW.child_id OR OLD.vocabulary_id<>NEW.vocabulary_id BEGIN
  DELETE FROM vocabulary_training_rollups WHERE child_id=OLD.child_id AND vocabulary_id=OLD.vocabulary_id;
  INSERT INTO vocabulary_training_rollups(child_id,vocabulary_id,first_training_day,last_training_day,appearance_days,event_count,correct_count,last_trained_at,updated_at)
  SELECT OLD.child_id,OLD.vocabulary_id,MIN(date(created_at,'+8 hours')),MAX(date(created_at,'+8 hours')),
    COUNT(DISTINCT date(created_at,'+8 hours')),COUNT(*),SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END),MAX(created_at),CURRENT_TIMESTAMP
  FROM vocabulary_training_events WHERE child_id=OLD.child_id AND vocabulary_id=OLD.vocabulary_id
  HAVING COUNT(*)>0;
  DELETE FROM vocabulary_training_rollups WHERE child_id=NEW.child_id AND vocabulary_id=NEW.vocabulary_id;
  INSERT INTO vocabulary_training_rollups(child_id,vocabulary_id,first_training_day,last_training_day,appearance_days,event_count,correct_count,last_trained_at,updated_at)
  SELECT NEW.child_id,NEW.vocabulary_id,MIN(date(created_at,'+8 hours')),MAX(date(created_at,'+8 hours')),
    COUNT(DISTINCT date(created_at,'+8 hours')),COUNT(*),SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END),MAX(created_at),CURRENT_TIMESTAMP
  FROM vocabulary_training_events WHERE child_id=NEW.child_id AND vocabulary_id=NEW.vocabulary_id
  HAVING COUNT(*)>0;
END;

CREATE TABLE IF NOT EXISTS tenant_ai_daily_rollups (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usage_date TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(tenant_id,usage_date)
);
INSERT OR REPLACE INTO tenant_ai_daily_rollups(tenant_id,usage_date,request_count,input_tokens,output_tokens,event_count,failed_count,updated_at)
SELECT tenant_id,substr(created_at,1,10),COALESCE(SUM(request_count),0),COALESCE(SUM(input_tokens),0),COALESCE(SUM(output_tokens),0),COUNT(*),
  SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END),CURRENT_TIMESTAMP
FROM tenant_ai_usage GROUP BY tenant_id,substr(created_at,1,10);
CREATE INDEX IF NOT EXISTS idx_tenant_ai_daily_rollups_tenant_date
  ON tenant_ai_daily_rollups(tenant_id,usage_date,request_count);

CREATE TRIGGER IF NOT EXISTS trg_h119_tenant_ai_usage_insert
AFTER INSERT ON tenant_ai_usage BEGIN
  INSERT INTO tenant_ai_daily_rollups(tenant_id,usage_date,request_count,input_tokens,output_tokens,event_count,failed_count,updated_at)
  VALUES(NEW.tenant_id,substr(NEW.created_at,1,10),COALESCE(NEW.request_count,0),COALESCE(NEW.input_tokens,0),COALESCE(NEW.output_tokens,0),1,CASE WHEN NEW.status='failed' THEN 1 ELSE 0 END,CURRENT_TIMESTAMP)
  ON CONFLICT(tenant_id,usage_date) DO UPDATE SET
    request_count=request_count+COALESCE(NEW.request_count,0),input_tokens=input_tokens+COALESCE(NEW.input_tokens,0),
    output_tokens=output_tokens+COALESCE(NEW.output_tokens,0),event_count=event_count+1,
    failed_count=failed_count+CASE WHEN NEW.status='failed' THEN 1 ELSE 0 END,updated_at=CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_tenant_ai_usage_delete
AFTER DELETE ON tenant_ai_usage BEGIN
  UPDATE tenant_ai_daily_rollups SET
    request_count=MAX(0,request_count-COALESCE(OLD.request_count,0)),input_tokens=MAX(0,input_tokens-COALESCE(OLD.input_tokens,0)),
    output_tokens=MAX(0,output_tokens-COALESCE(OLD.output_tokens,0)),event_count=MAX(0,event_count-1),
    failed_count=MAX(0,failed_count-CASE WHEN OLD.status='failed' THEN 1 ELSE 0 END),updated_at=CURRENT_TIMESTAMP
  WHERE tenant_id=OLD.tenant_id AND usage_date=substr(OLD.created_at,1,10);
  DELETE FROM tenant_ai_daily_rollups WHERE tenant_id=OLD.tenant_id AND usage_date=substr(OLD.created_at,1,10) AND event_count=0;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_tenant_ai_usage_update_value
AFTER UPDATE OF request_count,input_tokens,output_tokens,status ON tenant_ai_usage
WHEN OLD.tenant_id=NEW.tenant_id AND substr(OLD.created_at,1,10)=substr(NEW.created_at,1,10) BEGIN
  UPDATE tenant_ai_daily_rollups SET
    request_count=MAX(0,request_count-COALESCE(OLD.request_count,0)+COALESCE(NEW.request_count,0)),
    input_tokens=MAX(0,input_tokens-COALESCE(OLD.input_tokens,0)+COALESCE(NEW.input_tokens,0)),
    output_tokens=MAX(0,output_tokens-COALESCE(OLD.output_tokens,0)+COALESCE(NEW.output_tokens,0)),
    failed_count=MAX(0,failed_count-CASE WHEN OLD.status='failed' THEN 1 ELSE 0 END+CASE WHEN NEW.status='failed' THEN 1 ELSE 0 END),
    updated_at=CURRENT_TIMESTAMP
  WHERE tenant_id=NEW.tenant_id AND usage_date=substr(NEW.created_at,1,10);
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_tenant_ai_usage_update_key
AFTER UPDATE OF tenant_id,created_at ON tenant_ai_usage
WHEN OLD.tenant_id<>NEW.tenant_id OR substr(OLD.created_at,1,10)<>substr(NEW.created_at,1,10) BEGIN
  UPDATE tenant_ai_daily_rollups SET
    request_count=MAX(0,request_count-COALESCE(OLD.request_count,0)),input_tokens=MAX(0,input_tokens-COALESCE(OLD.input_tokens,0)),
    output_tokens=MAX(0,output_tokens-COALESCE(OLD.output_tokens,0)),event_count=MAX(0,event_count-1),
    failed_count=MAX(0,failed_count-CASE WHEN OLD.status='failed' THEN 1 ELSE 0 END),updated_at=CURRENT_TIMESTAMP
  WHERE tenant_id=OLD.tenant_id AND usage_date=substr(OLD.created_at,1,10);
  DELETE FROM tenant_ai_daily_rollups WHERE tenant_id=OLD.tenant_id AND usage_date=substr(OLD.created_at,1,10) AND event_count=0;
  INSERT INTO tenant_ai_daily_rollups(tenant_id,usage_date,request_count,input_tokens,output_tokens,event_count,failed_count,updated_at)
  VALUES(NEW.tenant_id,substr(NEW.created_at,1,10),COALESCE(NEW.request_count,0),COALESCE(NEW.input_tokens,0),COALESCE(NEW.output_tokens,0),1,CASE WHEN NEW.status='failed' THEN 1 ELSE 0 END,CURRENT_TIMESTAMP)
  ON CONFLICT(tenant_id,usage_date) DO UPDATE SET
    request_count=request_count+COALESCE(NEW.request_count,0),input_tokens=input_tokens+COALESCE(NEW.input_tokens,0),
    output_tokens=output_tokens+COALESCE(NEW.output_tokens,0),event_count=event_count+1,
    failed_count=failed_count+CASE WHEN NEW.status='failed' THEN 1 ELSE 0 END,updated_at=CURRENT_TIMESTAMP;
END;

CREATE TABLE IF NOT EXISTS generation_job_status_rollups (
  tenant_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  queued_count INTEGER NOT NULL DEFAULT 0,
  running_count INTEGER NOT NULL DEFAULT 0,
  succeeded_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  timed_out_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(tenant_id,scope)
);
INSERT OR REPLACE INTO generation_job_status_rollups(tenant_id,scope,queued_count,running_count,succeeded_count,failed_count,timed_out_count,updated_at)
SELECT COALESCE(tenant_id,''),scope,SUM(CASE WHEN status='queued' AND deleted_at IS NULL THEN 1 ELSE 0 END),
  SUM(CASE WHEN status='running' AND deleted_at IS NULL THEN 1 ELSE 0 END),SUM(CASE WHEN status='succeeded' AND deleted_at IS NULL THEN 1 ELSE 0 END),
  SUM(CASE WHEN status='failed' AND deleted_at IS NULL THEN 1 ELSE 0 END),SUM(CASE WHEN status='failed' AND stage='timed_out' AND deleted_at IS NULL THEN 1 ELSE 0 END),CURRENT_TIMESTAMP
FROM generation_jobs GROUP BY COALESCE(tenant_id,''),scope;
CREATE INDEX IF NOT EXISTS idx_generation_job_rollups_tenant_scope
  ON generation_job_status_rollups(tenant_id,scope);

CREATE TRIGGER IF NOT EXISTS trg_h119_generation_jobs_insert
AFTER INSERT ON generation_jobs BEGIN
  INSERT INTO generation_job_status_rollups(tenant_id,scope,queued_count,running_count,succeeded_count,failed_count,timed_out_count,updated_at)
  VALUES(COALESCE(NEW.tenant_id,''),NEW.scope,
    CASE WHEN NEW.status='queued' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.status='running' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.status='succeeded' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.status='failed' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.status='failed' AND NEW.stage='timed_out' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,CURRENT_TIMESTAMP)
  ON CONFLICT(tenant_id,scope) DO UPDATE SET
    queued_count=queued_count+excluded.queued_count,running_count=running_count+excluded.running_count,
    succeeded_count=succeeded_count+excluded.succeeded_count,failed_count=failed_count+excluded.failed_count,
    timed_out_count=timed_out_count+excluded.timed_out_count,updated_at=CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_generation_jobs_delete
AFTER DELETE ON generation_jobs BEGIN
  UPDATE generation_job_status_rollups SET
    queued_count=MAX(0,queued_count-CASE WHEN OLD.status='queued' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),
    running_count=MAX(0,running_count-CASE WHEN OLD.status='running' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),
    succeeded_count=MAX(0,succeeded_count-CASE WHEN OLD.status='succeeded' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),
    failed_count=MAX(0,failed_count-CASE WHEN OLD.status='failed' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),
    timed_out_count=MAX(0,timed_out_count-CASE WHEN OLD.status='failed' AND OLD.stage='timed_out' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),updated_at=CURRENT_TIMESTAMP
  WHERE tenant_id=COALESCE(OLD.tenant_id,'') AND scope=OLD.scope;
  DELETE FROM generation_job_status_rollups WHERE tenant_id=COALESCE(OLD.tenant_id,'') AND scope=OLD.scope
    AND queued_count+running_count+succeeded_count+failed_count=0;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_generation_jobs_update_value
AFTER UPDATE OF status,stage,deleted_at ON generation_jobs
WHEN COALESCE(OLD.tenant_id,'')=COALESCE(NEW.tenant_id,'') AND OLD.scope=NEW.scope BEGIN
  UPDATE generation_job_status_rollups SET
    queued_count=MAX(0,queued_count-CASE WHEN OLD.status='queued' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END+CASE WHEN NEW.status='queued' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END),
    running_count=MAX(0,running_count-CASE WHEN OLD.status='running' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END+CASE WHEN NEW.status='running' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END),
    succeeded_count=MAX(0,succeeded_count-CASE WHEN OLD.status='succeeded' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END+CASE WHEN NEW.status='succeeded' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END),
    failed_count=MAX(0,failed_count-CASE WHEN OLD.status='failed' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END+CASE WHEN NEW.status='failed' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END),
    timed_out_count=MAX(0,timed_out_count-CASE WHEN OLD.status='failed' AND OLD.stage='timed_out' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END+CASE WHEN NEW.status='failed' AND NEW.stage='timed_out' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END),updated_at=CURRENT_TIMESTAMP
  WHERE tenant_id=COALESCE(NEW.tenant_id,'') AND scope=NEW.scope;
END;

CREATE TRIGGER IF NOT EXISTS trg_h119_generation_jobs_update_key
AFTER UPDATE OF tenant_id,scope ON generation_jobs
WHEN COALESCE(OLD.tenant_id,'')<>COALESCE(NEW.tenant_id,'') OR OLD.scope<>NEW.scope BEGIN
  UPDATE generation_job_status_rollups SET
    queued_count=MAX(0,queued_count-CASE WHEN OLD.status='queued' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),
    running_count=MAX(0,running_count-CASE WHEN OLD.status='running' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),
    succeeded_count=MAX(0,succeeded_count-CASE WHEN OLD.status='succeeded' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),
    failed_count=MAX(0,failed_count-CASE WHEN OLD.status='failed' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),
    timed_out_count=MAX(0,timed_out_count-CASE WHEN OLD.status='failed' AND OLD.stage='timed_out' AND OLD.deleted_at IS NULL THEN 1 ELSE 0 END),updated_at=CURRENT_TIMESTAMP
  WHERE tenant_id=COALESCE(OLD.tenant_id,'') AND scope=OLD.scope;
  DELETE FROM generation_job_status_rollups WHERE tenant_id=COALESCE(OLD.tenant_id,'') AND scope=OLD.scope
    AND queued_count+running_count+succeeded_count+failed_count=0;
  INSERT INTO generation_job_status_rollups(tenant_id,scope,queued_count,running_count,succeeded_count,failed_count,timed_out_count,updated_at)
  VALUES(COALESCE(NEW.tenant_id,''),NEW.scope,
    CASE WHEN NEW.status='queued' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.status='running' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.status='succeeded' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.status='failed' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.status='failed' AND NEW.stage='timed_out' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END,CURRENT_TIMESTAMP)
  ON CONFLICT(tenant_id,scope) DO UPDATE SET
    queued_count=queued_count+excluded.queued_count,running_count=running_count+excluded.running_count,
    succeeded_count=succeeded_count+excluded.succeeded_count,failed_count=failed_count+excluded.failed_count,
    timed_out_count=timed_out_count+excluded.timed_out_count,updated_at=CURRENT_TIMESTAMP;
END;

-- Indexed cursor sampling replaces full candidate-set random sorting.
ALTER TABLE question_bank_items ADD COLUMN sample_key INTEGER NOT NULL DEFAULT 0;
UPDATE question_bank_items SET sample_key=((rowid*1103515245+12345)&2147483647) WHERE sample_key=0;
CREATE INDEX IF NOT EXISTS idx_qbank_category_sample
  ON question_bank_items(category,sample_key,question_id);
CREATE INDEX IF NOT EXISTS idx_qbank_category_subcategory_sample
  ON question_bank_items(category,subcategory,sample_key,question_id);

ALTER TABLE vocabulary_catalog_stages ADD COLUMN sample_key INTEGER NOT NULL DEFAULT 0;
UPDATE vocabulary_catalog_stages SET sample_key=((rowid*1103515245+12345)&2147483647) WHERE sample_key=0;
CREATE INDEX IF NOT EXISTS idx_vocabulary_stage_sample
  ON vocabulary_catalog_stages(stage,sample_key,vocabulary_id);

-- Cover the remaining bounded Reading/Listening, dashboard and FIFO access paths.
CREATE INDEX IF NOT EXISTS idx_question_attempts_child_content_result
  ON question_attempts(child_id,content_id,is_correct,question_id,created_at);
CREATE INDEX IF NOT EXISTS idx_questions_content_status_scope
  ON questions(source_content_id,status,scope,tenant_id,id);
CREATE INDEX IF NOT EXISTS idx_questions_bank_visibility
  ON questions(school_level,status,scope,tenant_id,difficulty,id);
CREATE INDEX IF NOT EXISTS idx_content_scope_status_type_level
  ON content_items(scope,status,tenant_id,content_type,school_level,created_at,id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_tenant_display
  ON generation_jobs(tenant_id,scope,deleted_at,status,enqueued_at,created_at,id);
CREATE INDEX IF NOT EXISTS idx_tenant_ai_usage_tenant_created_cover
  ON tenant_ai_usage(tenant_id,created_at,request_count,input_tokens,output_tokens,status);
