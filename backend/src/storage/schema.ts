import { pgPool } from './postgres'

export async function initSchema() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS work_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      component_id TEXT NOT NULL,
      component_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      priority TEXT NOT NULL,
      signal_count INTEGER DEFAULT 1,
      first_signal_time TIMESTAMPTZ NOT NULL,
      resolved_time TIMESTAMPTZ,
      mttr_minutes FLOAT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rca_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID REFERENCES work_items(id),
      root_cause_category TEXT NOT NULL,
      fix_applied TEXT NOT NULL,
      prevention_steps TEXT NOT NULL,
      incident_start TIMESTAMPTZ NOT NULL,
      incident_end TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log('[Schema] Postgres tables ready')
}