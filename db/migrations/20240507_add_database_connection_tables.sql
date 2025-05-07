-- Migration: Add database connection tables and update existing tables
-- Date: 2024-05-07

-- Update tools table to add missing columns
ALTER TABLE IF EXISTS tools
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS implementation TEXT,
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;

-- Create database_connections table
CREATE TABLE IF NOT EXISTS database_connections (
  id VARCHAR(36) PRIMARY KEY,
  connection_type TEXT NOT NULL, -- 'session', 'transaction', 'direct'
  pool_name TEXT NOT NULL,
  connection_url TEXT NOT NULL,
  max_connections INTEGER NOT NULL DEFAULT 10,
  idle_timeout_ms INTEGER NOT NULL DEFAULT 10000,
  connection_timeout_ms INTEGER NOT NULL DEFAULT 30000,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create database_transactions table
CREATE TABLE IF NOT EXISTS database_transactions (
  id VARCHAR(36) PRIMARY KEY,
  connection_id VARCHAR(36) NOT NULL REFERENCES database_connections(id),
  transaction_type TEXT NOT NULL, -- 'read', 'write', 'mixed'
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'committed', 'rolled_back', 'failed'
  query_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create database_queries table
CREATE TABLE IF NOT EXISTS database_queries (
  id VARCHAR(36) PRIMARY KEY,
  transaction_id VARCHAR(36) REFERENCES database_transactions(id),
  query_text TEXT NOT NULL,
  query_type TEXT NOT NULL, -- 'select', 'insert', 'update', 'delete', 'other'
  execution_time_ms INTEGER,
  row_count INTEGER,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_database_connections_status ON database_connections(status);
CREATE INDEX IF NOT EXISTS idx_database_transactions_connection_id ON database_transactions(connection_id);
CREATE INDEX IF NOT EXISTS idx_database_transactions_status ON database_transactions(status);
CREATE INDEX IF NOT EXISTS idx_database_queries_transaction_id ON database_queries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_database_queries_query_type ON database_queries(query_type);

-- Insert default connection records for session and transaction poolers
INSERT INTO database_connections (
  id, 
  connection_type, 
  pool_name, 
  connection_url, 
  max_connections, 
  status, 
  metadata
)
VALUES 
(
  '00000000-0000-0000-0000-000000000001', 
  'session', 
  'default_session_pool', 
  'SESSION_POOL_URL environment variable', 
  20, 
  'active', 
  '{"description": "Default session pooler for read operations"}'
),
(
  '00000000-0000-0000-0000-000000000002', 
  'transaction', 
  'default_transaction_pool', 
  'DATABASE_URL environment variable', 
  10, 
  'active', 
  '{"description": "Default transaction pooler for write operations"}'
);

-- Create RLS policies for database connection tables
ALTER TABLE database_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_queries ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY admin_all_database_connections ON database_connections
  FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY admin_all_database_transactions ON database_transactions
  FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY admin_all_database_queries ON database_queries
  FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
