import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const nublId = 'b683ac00-3b3a-482c-af3d-c61c704dc760'; // Nubl Rahman's ID
  console.log("Deleting all test sessions for Nubl Rahman...");
  
  const { data, error } = await supabase
    .from('test_sessions')
    .delete()
    .eq('student_id', nublId);
    
  console.log("Result:", { data, error });
}

run();
