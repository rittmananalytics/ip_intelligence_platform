import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

// Create a PostgreSQL pool using environment variables provided by Replit
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create a drizzle instance
export const db = drizzle(pool, { schema });

// Test database connection
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Run migrations programmatically
export async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    // Check connection
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to database, skipping initialization');
      return false;
    }
    
    // Check if tables exist
    const tablesExist = await checkTablesExist();
    if (tablesExist) {
      console.log('Database tables already exist, skipping initialization');
      return true;
    }
    
    // Create tables manually since we're not using drizzle-kit for migrations
    await createTables();
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Check if our tables already exist
async function checkTablesExist() {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = 'ip_enrichment_jobs'
    );
  `);
  
  return result.rows[0].exists;
}

// Create the required tables
async function createTables() {
  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `);
  
  // Create ip_enrichment_jobs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ip_enrichment_jobs (
      id SERIAL PRIMARY KEY,
      file_name TEXT NOT NULL,
      original_file_name TEXT NOT NULL,
      total_ips INTEGER NOT NULL,
      processed_ips INTEGER DEFAULT 0,
      successful_ips INTEGER DEFAULT 0,
      failed_ips INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMP,
      user_id INTEGER REFERENCES users(id),
      error TEXT,
      ip_column_name TEXT NOT NULL,
      include_geolocation INTEGER DEFAULT 1,
      include_domain INTEGER DEFAULT 1,
      include_company INTEGER DEFAULT 1,
      include_network INTEGER DEFAULT 1,
      partial_save_available BOOLEAN DEFAULT FALSE,
      csv_headers TEXT[],
      last_checkpoint INTEGER DEFAULT 0
    );
  `);
  
  // Create ip_enrichment_results table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ip_enrichment_results (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES ip_enrichment_jobs(id),
      original_data JSONB NOT NULL,
      enrichment_data JSONB,
      row_index INTEGER NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      success BOOLEAN DEFAULT FALSE,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  
  // Create index for faster queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_job_id ON ip_enrichment_results(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_row ON ip_enrichment_results(job_id, row_index);
  `);
}