-- Read-only audit for SQL Editor. Compare this output with supabase/migrations/.
select
  h.version,
  h.name,
  m.sha256,
  m.applied_at,
  m.applied_by,
  case when m.version is null then 'CLI_OR_LEGACY' else 'MANUAL_TRACKED' end as source
from supabase_migrations.schema_migrations h
left join supabase_migrations.manual_deployments m using (version)
order by h.version;
