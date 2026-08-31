import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
// Need service role key to query auth.users
const SUPABASE_SERVICE_KEY = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

if (!SUPABASE_SERVICE_KEY) {
  console.log("No service key found");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  
  const targetUser = users.users.find(u => u.email === 'nublrh11@gmail.com');
  console.log("Auth user for nublrh11@gmail.com:", targetUser ? targetUser.id : "Not found");
}

run();
