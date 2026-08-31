import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: sessions } = await supabase
    .from('test_sessions')
    .select(`
      id,
      student_id,
      created_at,
      completed_at,
      test_answers ( id, is_correct, questions ( category, type ) )
    `)
    .not('completed_at', 'is', null);

  console.log("Sessions with answers:", JSON.stringify(sessions, null, 2));
}

run();
