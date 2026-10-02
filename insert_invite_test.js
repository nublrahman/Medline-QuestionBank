import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rrjohgiekitwukkyssco.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyam9oZ2lla2l0d3Vra3lzc2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTE5NzMsImV4cCI6MjEwMDc4Nzk3M30.pm8PbHlewnJUihAmfy1EV-O8rbWBnlXlsSUhXYf0fYk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const code = 'TEST-CODE-123';
  const { data, error } = await supabase.from('invitation_codes').upsert([
    {
      code: code,
      status: 'Active',
      created_date: new Date().toISOString(),
      expires_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      student_name: '—',
    }
  ], { onConflict: 'code' }).select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Inserted invite code:', code);
  }
}

main();
