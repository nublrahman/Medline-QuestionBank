import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: answers, error } = await supabase.from('test_answers').select('id, session_id').in('session_id', [
    '90f74e2a-7ac2-405b-bba9-79e9ed68bfd1',
    '9c463382-ed5a-482f-8176-8ca2601287d4',
    '2bcc339f-058c-42a3-b761-f5949dbcd6d8'
  ]);
  console.log("Answers for Nubl Rahman's sessions:", answers.length);
}

run();
