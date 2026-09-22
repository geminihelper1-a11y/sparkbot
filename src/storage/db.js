const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

class NethrionDB {
  constructor(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }
  exec(sql) { return this.db.exec(sql); }
  prepare(sql) { return this.db.prepare(sql); }
  transaction(fn) { return this.db.transaction(fn)(); }
  close() { this.db.close(); }
  migrate() {
    this.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS guild_settings(
        guild_id TEXT PRIMARY KEY, mode TEXT NOT NULL DEFAULT 'NORMAL', timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
        feature_flags_json TEXT NOT NULL DEFAULT '{}', provider_order_json TEXT NOT NULL DEFAULT '["gemini","groq"]',
        ai_limits_json TEXT NOT NULL DEFAULT '{}', channels_json TEXT NOT NULL DEFAULT '{}', roles_json TEXT NOT NULL DEFAULT '{}',
        privacy_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS members_index(
        guild_id TEXT NOT NULL, member_id TEXT NOT NULL, username TEXT, display_name TEXT, roles_json TEXT NOT NULL DEFAULT '[]',
        joined_at TEXT, last_seen_at TEXT, source TEXT NOT NULL DEFAULT 'discord', refreshed_at TEXT NOT NULL, PRIMARY KEY(guild_id,member_id)
      );
      CREATE TABLE IF NOT EXISTS roles_index(
        guild_id TEXT NOT NULL, role_id TEXT NOT NULL, name TEXT NOT NULL, position INTEGER NOT NULL, managed INTEGER NOT NULL DEFAULT 0,
        permissions_json TEXT NOT NULL DEFAULT '[]', refreshed_at TEXT NOT NULL, PRIMARY KEY(guild_id,role_id)
      );
      CREATE TABLE IF NOT EXISTS channels_index(
        guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, name TEXT NOT NULL, type INTEGER NOT NULL, parent_id TEXT, position INTEGER,
        refreshed_at TEXT NOT NULL, PRIMARY KEY(guild_id,channel_id)
      );
      CREATE TABLE IF NOT EXISTS minecraft_links(
        guild_id TEXT NOT NULL, discord_id TEXT NOT NULL, minecraft_name TEXT NOT NULL, created_by TEXT, created_at TEXT NOT NULL,
        PRIMARY KEY(guild_id,discord_id)
      );
      CREATE TABLE IF NOT EXISTS memory_facts(
        id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, subject_id TEXT NOT NULL, type TEXT NOT NULL,
        content TEXT NOT NULL, source TEXT NOT NULL, quality REAL NOT NULL DEFAULT 0.5, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_memory_subject ON memory_facts(guild_id, subject_id, type);
      CREATE TABLE IF NOT EXISTS conversation_turns(
        id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, channel_id TEXT NOT NULL,
        role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_turns_user ON conversation_turns(guild_id,user_id,created_at);
      CREATE TABLE IF NOT EXISTS knowledge_documents(
        id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL,
        body TEXT NOT NULL, source TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, editor_id TEXT, created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL, review_at TEXT, expires_at TEXT, active INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS cases(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,subject_id TEXT,category TEXT,status TEXT NOT NULL,summary TEXT,evidence_json TEXT NOT NULL DEFAULT '[]',created_by TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,reporter_id TEXT NOT NULL,target_id TEXT,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'OPEN',case_id INTEGER,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,channel_id TEXT UNIQUE,creator_id TEXT NOT NULL,assignee_id TEXT,category TEXT,status TEXT NOT NULL DEFAULT 'OPEN',summary TEXT,created_at TEXT NOT NULL,closed_at TEXT);
      CREATE TABLE IF NOT EXISTS ticket_events(id INTEGER PRIMARY KEY AUTOINCREMENT,ticket_id INTEGER NOT NULL,event_type TEXT NOT NULL,actor_id TEXT,payload_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS suggestions(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,author_id TEXT NOT NULL,content TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'OPEN',category TEXT,group_key TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS scheduled_jobs(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,owner_id TEXT NOT NULL,type TEXT NOT NULL,payload_json TEXT NOT NULL,schedule TEXT NOT NULL,timezone TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE',last_run_at TEXT,next_run_at TEXT,retries INTEGER NOT NULL DEFAULT 0,idempotency_key TEXT UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS job_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,job_id INTEGER NOT NULL,run_key TEXT UNIQUE,status TEXT NOT NULL,started_at TEXT NOT NULL,finished_at TEXT,error_code TEXT);
      CREATE TABLE IF NOT EXISTS smp_config(guild_id TEXT PRIMARY KEY,java_host TEXT NOT NULL,java_port INTEGER NOT NULL,bedrock_host TEXT,bedrock_port INTEGER,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS smp_status(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,edition TEXT NOT NULL,status TEXT NOT NULL,players_online INTEGER,players_max INTEGER,version TEXT,latency_ms INTEGER,source TEXT,checked_at TEXT NOT NULL,raw_json TEXT);
      CREATE INDEX IF NOT EXISTS idx_smp_status ON smp_status(guild_id,checked_at);
      CREATE TABLE IF NOT EXISTS smp_events(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,event_type TEXT NOT NULL,from_status TEXT,to_status TEXT,details_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS analytics_events(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,event_type TEXT NOT NULL,subject_id TEXT,payload_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_analytics_events ON analytics_events(guild_id,event_type,created_at);
      CREATE TABLE IF NOT EXISTS analytics_daily(guild_id TEXT NOT NULL,day TEXT NOT NULL,metric TEXT NOT NULL,value REAL NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(guild_id,day,metric));
      CREATE TABLE IF NOT EXISTS backups(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,path TEXT NOT NULL,manifest_json TEXT NOT NULL,created_at TEXT NOT NULL,checksum TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,action_id TEXT NOT NULL,actor_id TEXT,request TEXT,resolved_intent TEXT,tool_name TEXT,target_json TEXT NOT NULL DEFAULT '{}',permission_json TEXT NOT NULL DEFAULT '{}',result_state TEXT NOT NULL,error_code TEXT,timestamp TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_audit_guild ON audit_events(guild_id,timestamp);
      CREATE TABLE IF NOT EXISTS security_incidents(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,incident_key TEXT NOT NULL,severity TEXT NOT NULL,status TEXT NOT NULL,evidence_json TEXT NOT NULL DEFAULT '[]',first_seen_at TEXT NOT NULL,last_seen_at TEXT NOT NULL UNIQUE(guild_id,incident_key));
      CREATE TABLE IF NOT EXISTS ai_usage(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,user_id TEXT,provider TEXT,model TEXT,tokens_in INTEGER,tokens_out INTEGER,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_ai_usage ON ai_usage(guild_id,user_id,created_at);
      CREATE TABLE IF NOT EXISTS provider_health(provider TEXT PRIMARY KEY,status TEXT NOT NULL,last_error_code TEXT,consecutive_failures INTEGER NOT NULL DEFAULT 0,last_ok_at TEXT,last_checked_at TEXT);
      CREATE TABLE IF NOT EXISTS health_snapshots(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,component TEXT NOT NULL,status TEXT NOT NULL,details_json TEXT NOT NULL DEFAULT '{}',checked_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS action_plans(action_id TEXT PRIMARY KEY,guild_id TEXT NOT NULL,actor_id TEXT NOT NULL,tool_name TEXT NOT NULL,risk TEXT NOT NULL,plan_json TEXT NOT NULL,expires_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',created_at TEXT NOT NULL,verified_at TEXT);
      CREATE TABLE IF NOT EXISTS streaks(guild_id TEXT NOT NULL,user_id TEXT NOT NULL,current_streak INTEGER NOT NULL DEFAULT 0,highest_streak INTEGER NOT NULL DEFAULT 0,last_active_date TEXT,total_active_days INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,user_id));
      CREATE TABLE IF NOT EXISTS panels(guild_id TEXT NOT NULL,panel_key TEXT NOT NULL,channel_id TEXT,message_id TEXT,updated_at TEXT NOT NULL,PRIMARY KEY(guild_id,panel_key));
      CREATE TABLE IF NOT EXISTS knowledge_relations(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,from_type TEXT NOT NULL,from_id TEXT NOT NULL,relation TEXT NOT NULL,to_type TEXT NOT NULL,to_id TEXT NOT NULL,confidence REAL NOT NULL DEFAULT 0.5,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_knowledge_relations ON knowledge_relations(guild_id,from_type,from_id);
    `);
  }
}
module.exports = { NethrionDB };
