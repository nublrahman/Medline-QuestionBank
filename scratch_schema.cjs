const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: questions, error } = await supabase.from('questions').select('*').limit(1);
  if (error) console.error(error);
  else console.log('Questions schema keys:', Object.keys(questions[0] || {}));
}

test();
