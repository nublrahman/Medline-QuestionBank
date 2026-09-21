import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const qid = 'caf95bfd-72e0-48c2-a853-455f93487a30'; // a valid parent uuid
  const invalidQid = `${qid}-sub-0`;
  const { data, error } = await supabase.from('test_answers').insert({
    session_id: '8f5fc4bb-fdcd-4002-a38e-bcfa2f303165',
    question_id: invalidQid,
    selected_options: null,
    is_correct: false
  });
  console.log("Error:", error);
}

check();
