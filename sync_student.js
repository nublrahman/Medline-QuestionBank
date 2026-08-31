import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const newAuthId = 'f1fd5d45-511b-4790-b70c-bbccc0aacb0d';
  const oldAuthId = 'b683ac00-3b3a-482c-af3d-c61c704dc760';

  console.log("Updating student ID to match new Auth ID...");
  
  // Update the student row ID
  const { data, error } = await supabase
    .from('students')
    .update({ id: newAuthId })
    .eq('id', oldAuthId);
    
  console.log("Result:", { data, error });
}

run();
