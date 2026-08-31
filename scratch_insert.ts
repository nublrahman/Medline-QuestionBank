import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const newStudent = {
    name: "Thomas Test",
    email: "thomas@gmail.com",
    initials: "TT",
    tests_taken: 0,
    avg_score: 0,
    last_status: "-",
    trend: "up",
    invitation_code: "MED-2026-BCAJW"
  };
  const { data, error } = await supabase.from('students').insert([newStudent]);
  console.log("Insert result:", { data, error });
}

test();
