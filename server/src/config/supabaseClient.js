import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (3 levels up from server/src/config/)
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file');
  console.error('Loaded from:', resolve(__dirname, '../../../.env'));
}

export const supabase = createClient(supabaseUrl, supabaseKey);
export const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'skills-files';
