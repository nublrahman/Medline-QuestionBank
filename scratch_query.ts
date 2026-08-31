import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: s, error: sErr } = await supabase.from('test_sessions').select('id, test_answers(*)').limit(1);
  console.log('Session with answers:', JSON.stringify(s, null, 2));
  if (sErr) console.error('sErr', sErr);
}

test();
