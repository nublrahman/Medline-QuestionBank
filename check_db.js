import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  // Fix the older test sessions that have the orphaned Auth ID
  const oldAuthId = 'f1fd5d45-511b-4790-b70c-bbccc0aacb0d';
  // Let's assign them to the first student in the students table
  const { data: students } = await supabase.from('students').select('id, name').limit(1);
  if (students && students.length > 0) {
    const studentId = students[0].id;
    console.log(`Fixing test_sessions: updating student_id to ${studentId} (${students[0].name})`);
    await supabase.from('test_sessions').update({ student_id: studentId }).eq('student_id', oldAuthId);
    
    // Also fix the nil UUID one
    await supabase.from('test_sessions').update({ student_id: studentId }).eq('student_id', '00000000-0000-0000-0000-000000000000');
    console.log("Database references fixed!");
  }
}

run();
