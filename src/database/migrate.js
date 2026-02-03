import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log('🚀 Starting database migration...');

  try {
    const isProduction = config.nodeEnv === 'production';

    if (isProduction) {
      // Production: only run safe migrations (no DROP). Preserves existing data.
      const migrationsDir = join(__dirname, 'migrations');
      if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        for (const file of files) {
          const sql = fs.readFileSync(join(migrationsDir, file), 'utf8');
          const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
          for (const stmt of statements) {
            if (stmt) await pool.query(stmt);
          }
          console.log('  Ran migration:', file);
        }
      }
      console.log('✅ Production migration completed (oauth_sessions etc.)');
    } else {
      // Development: run full schema (drops and recreates all tables)
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ Database migration completed successfully!');
      console.log('Created tables: users, tesla_tokens, vehicles, trips, telemetry_data, oauth_sessions');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

migrate();
