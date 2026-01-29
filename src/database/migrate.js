import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log('🚀 Starting database migration...');
  
  try {
    // Read the schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    console.log('Created tables:');
    console.log('  - users');
    console.log('  - tesla_tokens');
    console.log('  - vehicles');
    console.log('  - trips');
    console.log('  - telemetry_data');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

migrate();
