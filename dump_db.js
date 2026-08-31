import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: students } = await supabase.from('students').select('id, name');
  const { data: sessions } = await supabase.from('test_sessions').select('id, student_id, completed_at');
  
  console.log("Students:", students);
  console.log("Sessions:", sessions);
}

run();
