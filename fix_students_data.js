import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const orphanedId = '45f5ddfc-7523-46d4-956d-d6b5fb8a0609';
  const newId = 'b683ac00-3b3a-482c-af3d-c61c704dc760'; // Nubl Rahman

  console.log(`Re-assigning orphaned test sessions to ${newId}`);
  const { data, error } = await supabase.from('test_sessions').update({ student_id: newId }).eq('student_id', orphanedId);
  console.log("Result:", { data, error });
}

run();
